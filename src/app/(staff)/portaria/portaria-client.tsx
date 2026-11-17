"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { get, setMany, update, del } from "idb-keyval";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";
import { canReplay, gateStorageKey, appendOfflineEntry, type GateJournal, type PendingCheckin } from "@/lib/gate-offline";

type Event = { id: string; title: string; date: string };
type GateTicket = { id: string; qrHash: string; status: string; participantName: string; participantCpf: string; usedAt: string | null; batch: { name: string; event: { id: string; title: string } }; user: { name: string } };
type Scope = { eventId: string; tickets: GateTicket[]; queue: PendingCheckin[]; used: string[]; downloadedAt: string | null; loaded: boolean };
const blank = (eventId = ""): Scope => ({ eventId, tickets: [], queue: [], used: [], downloadedAt: null, loaded: false });
const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify); window.addEventListener("offline", notify);
  return () => { window.removeEventListener("online", notify); window.removeEventListener("offline", notify); };
};
const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground";
const button = "rounded-lg bg-brand px-4 py-2 text-white disabled:opacity-40";

export function PortariaClient({ actorId }: { actorId: string }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [events, setEvents] = useState<Event[]>([]);
  const [scope, setScope] = useState<Scope>(blank);
  const current = useRef(scope);
  const generation = useRef(0);
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [legacyPending, setLegacyPending] = useState(false);
  const legacyBlocked = useRef(false);
  const offlineIndex = useRef<{ tickets: GateTicket[]; hashes: Map<string, GateTicket>; short: Map<string, GateTicket | null> } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanner = useRef<Html5QrcodeScanner | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const commit = useCallback((next: Scope) => { current.current = next; setScope(next); }, []);

  const beep = useCallback((ok: boolean) => {
    try {
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audio.current ??= new Context();
      void audio.current.resume();
      const oscillator = audio.current.createOscillator(), gain = audio.current.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = ok ? 880 : 220;
      gain.gain.value = .15; oscillator.connect(gain); gain.connect(audio.current.destination);
      oscillator.start(); oscillator.stop(audio.current.currentTime + .18);
    } catch { /* The visible result remains available when audio is unavailable. */ }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/portaria/events", { signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || data.actorId !== actorId) throw new Error(data.error || "Recarregue a portaria para validar a sessão.");
      setEvents(data.events);
    }).catch(error => { if (error.name !== "AbortError") setMessage({ ok: false, text: error.message }); });
    get("portaria_pending").then(value => { legacyBlocked.current = Array.isArray(value) && value.length > 0; setLegacyPending(legacyBlocked.current); }).catch(() => { legacyBlocked.current = true; setLegacyPending(true); });
    return () => { abort.abort(); void scanner.current?.clear().catch(() => {}); void audio.current?.close(); };
  }, [actorId]);

  const selectEvent = async (eventId: string) => {
    if (working.current) return;
    generation.current++;
    const version = generation.current;
    if (scanner.current) { await scanner.current.clear().catch(() => {}); scanner.current = null; }
    setScannerOpen(false); setMessage(null); setSearch(""); commit(blank(eventId));
    if (!eventId) return;
    const key = gateStorageKey(actorId, eventId);
    try {
      const [tickets, journal, downloadedAt] = await Promise.all([get(key + ":tickets"), get(key + ":journal"), get(key + ":at")]);
      if (version === generation.current) commit({ eventId, tickets: tickets ?? [], queue: journal?.queue ?? [], used: journal?.used ?? [], downloadedAt: downloadedAt ?? null, loaded: true });
    } catch { if (version === generation.current) commit({ ...blank(eventId), loaded: true }); setMessage({ ok: false, text: "O armazenamento deste aparelho está indisponível. Use a validação online." }); }
  };

  const replayPending = useCallback(async () => {
    const active = current.current;
    if (working.current || !navigator.onLine || !active.loaded || !active.eventId || !active.queue.some(entry => canReplay(entry, active.eventId))) return;
    working.current = true; setBusy(true);
    let queue = [...active.queue];
    try {
      for (const entry of active.queue.filter(item => canReplay(item, active.eventId))) {
        const response = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actorId, eventId: entry.eventId, qrHash: entry.qrHash }) });
        const data = await response.json();
        if (response.ok) queue = queue.filter(item => item.id !== entry.id);
        else if (response.status === 409 || response.status === 404) queue = queue.map(item => item.id === entry.id ? { ...item, state: "CONFLICT", message: data.error } : item);
        else throw new Error(data.error || "Não foi possível enviar as entradas pendentes.");
        await update(gateStorageKey(actorId, active.eventId) + ":journal", (stored: GateJournal | undefined) => {
          const latest = stored ?? { queue: active.queue, used: active.used };
          const decided = queue.find(item => item.id === entry.id);
          queue = decided ? latest.queue.map(item => item.id === entry.id ? decided : item) : latest.queue.filter(item => item.id !== entry.id);
          return { ...latest, queue };
        });
      }
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Falha ao enviar entradas pendentes." }); }
    finally { commit({ ...current.current, queue }); working.current = false; setBusy(false); }
  }, [actorId, commit]);

  useEffect(() => {
    if (!online || !scope.loaded) return;
    const timer = setTimeout(() => void replayPending(), 0);
    return () => clearTimeout(timer);
  }, [online, scope.eventId, scope.loaded, replayPending]);

  const sync = async () => {
    if (!scope.eventId || working.current || !online) return;
    await replayPending();
    if (working.current) return;
    working.current = true; setBusy(true);
    const active = current.current;
    try {
      const downloaded: GateTicket[] = [];
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams({ eventId: active.eventId });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch("/api/portaria/sync?" + params);
        const data = await response.json();
        if (!response.ok || data.actorId !== actorId || data.event?.id !== active.eventId) throw new Error(data.error || "A sessão mudou. Recarregue a portaria.");
        downloaded.push(...data.tickets); cursor = data.nextCursor;
      } while (cursor);
      const at = new Date().toISOString();

      const key = gateStorageKey(actorId, active.eventId);
      await setMany([[key + ":tickets", downloaded], [key + ":at", at]]);
      const journal: GateJournal = await get(key + ":journal") ?? { queue: active.queue, used: active.used };
      commit({ ...active, ...journal, tickets: downloaded, downloadedAt: at });
      setMessage({ ok: true, text: `${downloaded.length} ingressos do evento baixados.` });
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Falha ao baixar ingressos." }); }
    finally { working.current = false; setBusy(false); }
  };

  const usedIds = useMemo(() => new Set(scope.used), [scope.used]);

  const processCode = async (raw: string) => {
    if (working.current || !current.current.eventId || !current.current.loaded) return;
    const hash = raw.trim();
    if (!hash) return;
    working.current = true; setBusy(true);
    const active = current.current;
    try {
      let response: Response | undefined;
      if (navigator.onLine) {
        try { response = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actorId, eventId: active.eventId, qrHash: hash }) }); }
        catch { response = undefined; }
      }
      if (response) {
        const data = await response.json();
        if (!response.ok) { beep(false); setMessage({ ok: false, text: data.error || "Ingresso recusado." }); return; }
        let journal: GateJournal = { queue: active.queue, used: [...new Set([...active.used, data.ticket.id])] };
        commit({ ...active, ...journal });
        try {
          await update(gateStorageKey(actorId, active.eventId) + ":journal", (stored: GateJournal | undefined) => {
            const latest = stored ?? journal;
            journal = { ...latest, used: [...new Set([...latest.used, data.ticket.id])] };
            return journal;
          });
        } catch { /* A confirmação do servidor continua válida sem armazenamento local. */ }
        commit({ ...active, ...journal }); beep(true); setMessage({ ok: true, text: `${data.ticket.buyerName} — entrada confirmada em ${data.ticket.eventName}.` }); return;
      }
      if (legacyBlocked.current) throw new Error("Há entradas de uma versão anterior para conciliar. Use a portaria conectada e solicite a revisão dessas pendências.");
      if (!active.downloadedAt) throw new Error("Baixe os ingressos deste evento antes de usar o modo offline.");
      if (offlineIndex.current?.tickets !== active.tickets) {
        const hashes = new Map(active.tickets.map(ticket => [ticket.qrHash, ticket]));
        const short = new Map<string, GateTicket | null>();
        for (const item of active.tickets) { const prefix = item.id.slice(0, 8); short.set(prefix, short.has(prefix) ? null : item); }
        offlineIndex.current = { tickets: active.tickets, hashes, short };
      }
      const lookup = offlineIndex.current;
      const ticket = hash.length === 8 ? lookup.short.get(hash.toLowerCase()) : lookup.hashes.get(hash);
      if (!ticket || ticket.batch.event.id !== active.eventId) throw new Error("Ingresso não encontrado na lista deste evento. Conecte para validar.");
      if (ticket.status !== "ACTIVE" || active.used.includes(ticket.id)) throw new Error("Ingresso já utilizado ou indisponível neste evento.");
      const entry: PendingCheckin = { id: crypto.randomUUID(), eventId: active.eventId, qrHash: hash, at: new Date().toISOString(), state: "PENDING" };
      let journal: GateJournal = { queue: active.queue, used: active.used };
      await update(gateStorageKey(actorId, active.eventId) + ":journal", (stored: GateJournal | undefined) => {
        journal = appendOfflineEntry(stored ?? journal, ticket.id, entry);
        return journal;
      });
      commit({ ...active, ...journal }); beep(true); setMessage({ ok: true, text: `${ticket.participantName} — entrada registrada neste aparelho, aguardando sincronização.` });
    } catch (error) { beep(false); setMessage({ ok: false, text: error instanceof Error ? error.message : "Não foi possível validar o ingresso." }); }
    finally { working.current = false; setBusy(false); }
  };

  const startScanner = async () => {
    if (!scope.eventId || !scope.loaded || scanner.current) return;
    beep(true); setScannerOpen(true);
    const version = generation.current;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (version !== generation.current) return;
    const reader = new Html5QrcodeScanner("gate-reader", { fps: 10, qrbox: 220 }, false);
    scanner.current = reader;
    reader.render(text => { void processCode(text); }, () => {});
  };

  const acknowledge = async (id: string) => {
    if (working.current) return;
    const active = current.current;
    let journal: GateJournal = { queue: active.queue, used: active.used };
    await update(gateStorageKey(actorId, active.eventId) + ":journal", (stored: GateJournal | undefined) => {
      const latest = stored ?? journal;
      journal = { ...latest, queue: latest.queue.filter(entry => entry.id !== id || entry.state !== "CONFLICT") };
      return journal;
    });
    commit({ ...active, ...journal });
  };
  const clearDownloaded = async () => {
    if (scope.queue.length || busy) { setMessage({ ok: false, text: "Revise ou sincronize as entradas pendentes antes de limpar os dados." }); return; }
    const key = gateStorageKey(actorId, scope.eventId);
    await Promise.all([del(key + ":tickets"), del(key + ":at")]); commit({ ...blank(scope.eventId), loaded: true });
  };
  const term = search.trim().toLowerCase();
  const visible = scope.tickets.filter(ticket => !term || `${ticket.participantName} ${ticket.participantCpf} ${ticket.id}`.toLowerCase().includes(term)).slice(0, 50);

  return <main className="min-h-screen bg-background text-foreground p-4 pt-8">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex items-center justify-between"><Link href="/ajuda#portaria" className="nav-control border border-border">Ajuda da operação</Link><h1 className="text-xl font-semibold">Portaria</h1></header>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <label className="block text-sm font-medium" htmlFor="gate-event">Evento desta entrada</label>
        <select id="gate-event" className={field} value={scope.eventId} disabled={busy} onChange={event => void selectEvent(event.target.value)}>
          <option value="">Selecione o evento antes de ler ingressos</option>
          {events.map(event => <option key={event.id} value={event.id}>{event.title} — {new Date(event.date).toLocaleDateString("pt-BR")}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>{online ? "Online" : "Offline"}</span>
          <button className={button} disabled={!scope.eventId || !online || busy || !scope.loaded} onClick={() => void sync()}>Baixar / sincronizar ingressos</button>
          <button className="text-muted-fg underline disabled:opacity-40" disabled={!scope.eventId || busy} onClick={() => void clearDownloaded()}>Limpar dados deste evento</button>
          <span>{scope.tickets.length} baixados · {scope.queue.length} pendências</span>
        </div>
        {scope.downloadedAt && <p className="text-xs text-muted-fg">Última lista: {new Date(scope.downloadedAt).toLocaleString("pt-BR")}</p>}
        {legacyPending && <p role="alert" className="text-sm text-error">Há entradas de uma versão anterior aguardando conciliação. O modo offline está bloqueado até a revisão.</p>}
      </div>
      {message && <div role={message.ok ? "status" : "alert"} className={`rounded-xl border p-4 ${message.ok ? "border-success text-success" : "border-error text-error"}`}>{message.text}</div>}
      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <button className={button} disabled={!scope.eventId || !scope.loaded || busy || scannerOpen} onClick={() => void startScanner()}>Iniciar câmera</button>
        {scannerOpen && <div id="gate-reader" />}
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void processCode(code); }}>
          <input className={field} aria-label="QR ou código do ingresso" placeholder="QR ou código do ingresso" value={code} onChange={event => setCode(event.target.value)} disabled={!scope.eventId || busy} />
          <button className={button} disabled={!scope.eventId || busy || !scope.loaded}>Validar</button>
        </form>
      </section>
      {scope.queue.filter(entry => entry.state === "CONFLICT").map(entry => <div key={entry.id} className="rounded-xl border border-error p-4 text-sm" role="alert">
        <p>{entry.message} — entrada offline de {new Date(entry.at).toLocaleString("pt-BR")}. Confira o caso antes de remover a pendência.</p>
        <button className="underline" disabled={busy} onClick={() => void acknowledge(entry.id)}>Confirmei a revisão</button>
      </div>)}
      <section className="space-y-3"><label className="block text-sm" htmlFor="gate-search">Buscar na lista baixada</label>
        <input id="gate-search" className={field} placeholder="Nome, CPF ou código" value={search} onChange={event => setSearch(event.target.value)} />
        {visible.map(ticket => <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div><p>{ticket.participantName}</p><p className="text-xs text-muted-fg">{ticket.batch.name} · {ticket.id.slice(0, 8).toUpperCase()}</p></div>
          {ticket.status === "USED" || usedIds.has(ticket.id) ? <span className="text-sm text-muted-fg">Utilizado</span> : <button className={button} disabled={busy} onClick={() => void processCode(ticket.qrHash)}>Dar entrada</button>}
        </div>)}
        {scope.tickets.length > 50 && <p className="text-xs text-muted-fg">Exibindo até 50 resultados. Use a busca para localizar o participante.</p>}
      </section>
    </div>
  </main>;
}
