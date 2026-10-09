"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, XCircle, AlertTriangle, Scan, Camera, ArrowLeft, RefreshCw, Wifi, WifiOff, Search, UserCheck } from "lucide-react";
import { get, set } from "idb-keyval";

type ScanResult =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: any }
  | { type: "error"; message: string }
  | { type: "warning"; message: string; usedAt?: string; buyer?: string };

type OfflineTicket = {
  id: string;
  qrHash: string;
  status: string;
  participantName: string;
  participantCpf: string;
  usedAt: string | null;
  batch: { name: string; event: { title: string } };
  user: { name: string };
};

export default function PortariaPage() {
  const router = useRouter();
  const [result, setResult] = useState<ScanResult>({ type: "idle" });
  const [scannerActive, setScannerActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"scanner" | "manual">("scanner");
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Offline / Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tickets, setTickets] = useState<OfflineTicket[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const playBeep = (type: "success" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "success") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = "square";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignorar erros de áudio
    }
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const loadLocalData = async () => {
      const localTickets = await get("portaria_tickets");
      if (localTickets) setTickets(localTickets);
      const pending = await get("portaria_pending");
      if (pending) setPendingCheckins(pending);
    };

    loadLocalData();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCheckins.length > 0) {
      syncPendingCheckins();
    }
  }, [isOnline, pendingCheckins.length]);

  const syncPendingCheckins = async () => {
    if (pendingCheckins.length === 0) return;
    
    let newPending = [...pendingCheckins];

    for (const qrHash of pendingCheckins) {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrHash }),
        });
        
        if (res.ok || res.status === 409) {
          newPending = newPending.filter(h => h !== qrHash);
        }
      } catch (error) {
        console.error("Erro ao sincronizar checkin:", qrHash, error);
      }
    }

    setPendingCheckins(newPending);
    await set("portaria_pending", newPending);
  };

  const syncData = async () => {
    if (!isOnline) {
      alert("Você está offline. Conecte-se à internet para baixar a lista.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const res = await fetch("/api/portaria/sync");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        await set("portaria_tickets", data.tickets);
        setResult({ type: "idle" });
      } else {
        alert("Erro ao sincronizar: " + data.error);
      }
    } catch (e) {
      alert("Erro de conexão ao sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateLocalTicketStatus = async (hash: string) => {
     const isShortCode = hash.length === 8;
     const newTickets = tickets.map(t => {
       if (isShortCode ? t.id.toLowerCase().startsWith(hash.toLowerCase()) : t.qrHash === hash) {
         return { ...t, status: "USED", usedAt: t.usedAt || new Date().toISOString() };
       }
       return t;
     });
     setTickets(newTickets);
     await set("portaria_tickets", newTickets);
  };

  const processCheckin = async (hash: string) => {
    setResult({ type: "loading" });
    const cleanHash = hash.trim();
    if (!cleanHash) {
       setResult({ type: "idle" });
       return;
    }

    try {
      if (isOnline) {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrHash: cleanHash }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          playBeep("success");
          setResult({ type: "success", data: data.ticket });
          updateLocalTicketStatus(cleanHash);
          return;
        } 
        if (res.status === 409 && data.usedAt) {
          playBeep("error");
          setResult({
            type: "warning",
            message: data.error,
            usedAt: data.usedAt,
            buyer: data.buyer,
          });
          updateLocalTicketStatus(cleanHash);
          return;
        }
        playBeep("error");
        setResult({ type: "error", message: data.error || "Erro desconhecido" });
        return;
      }
    } catch (error) {
      console.log("Erro online, fazendo fallback para modo offline.");
    }

    // Modo Offline
    const isShortCode = cleanHash.length === 8;
    const ticketIndex = tickets.findIndex(t => 
      isShortCode ? t.id.toLowerCase().startsWith(cleanHash.toLowerCase()) : t.qrHash === cleanHash
    );

    if (ticketIndex === -1) {
      playBeep("error");
      setResult({ type: "error", message: "Ingresso não encontrado ou inválido." });
      return;
    }

    const ticket = tickets[ticketIndex];

    if (ticket.status === "USED") {
      playBeep("error");
      setResult({
        type: "warning",
        message: "Ingresso já utilizado (Modo Offline)",
        usedAt: ticket.usedAt || new Date().toISOString(),
        buyer: ticket.participantName || ticket.user.name,
      });
      return;
    }

    if (ticket.status !== "ACTIVE") {
      playBeep("error");
      setResult({ type: "error", message: "Ingresso inválido: " + ticket.status });
      return;
    }

    // Sucesso Offline
    playBeep("success");
    setResult({
      type: "success",
      data: {
        id: ticket.id,
        buyerName: ticket.participantName || ticket.user.name,
        batchName: ticket.batch.name,
        eventName: ticket.batch.event.title,
        usedAt: new Date().toISOString()
      }
    });

    const newTickets = [...tickets];
    newTickets[ticketIndex] = { ...ticket, status: "USED", usedAt: new Date().toISOString() };
    setTickets(newTickets);
    set("portaria_tickets", newTickets);

    const newPending = [...pendingCheckins, cleanHash];
    setPendingCheckins(newPending);
    set("portaria_pending", newPending);
  };

  const startScanner = () => {
    if (scannerRef.current) return;
    setScannerActive(true);
    setResult({ type: "idle" });

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    let isProcessing = false;
    scanner.render(
      async (decodedText) => {
        if (isProcessing) return;
        isProcessing = true;
        scanner.pause(true);
        await processCheckin(decodedText);
        setTimeout(() => {
          isProcessing = false;
          scanner.resume();
          setResult({ type: "idle" });
        }, 3500);
      },
      (err) => {}
    );
    scannerRef.current = scanner;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  const filteredTickets = tickets.filter(t => {
    if (!searchTerm) return false; // só mostra resultados quando há busca
    const term = searchTerm.toLowerCase();
    const nameMatch = t.participantName?.toLowerCase().includes(term) || t.user.name.toLowerCase().includes(term);
    const cpfMatch = t.participantCpf?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
    const hashMatch = t.qrHash.toLowerCase().includes(term) || t.id.toLowerCase().startsWith(term);
    return nameMatch || cpfMatch || hashMatch;
  }).slice(0, 50); // Limita os resultados

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 relative pt-20">
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-card border-b border-border z-10 shadow-sm">
        <button onClick={() => router.back()} className="text-muted-fg hover:text-foreground flex items-center gap-2">
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="flex items-center gap-4">
          {pendingCheckins.length > 0 && (
            <span className="text-xs bg-warning text-warning-fg px-2 py-1 rounded-full animate-pulse font-medium">
              {pendingCheckins.length} fila offline
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button 
            onClick={syncData}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-2 bg-brand text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-dark transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </div>
      </div>

      <div className="w-full max-w-lg bg-card border border-card-border rounded-2xl p-4 md:p-6 shadow-xl flex flex-col items-center mt-4">
        
        <div className="flex w-full mb-6 bg-muted p-1 rounded-xl">
          <button 
            onClick={() => { setActiveTab("scanner"); setResult({type: 'idle'}); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex justify-center items-center gap-2 transition ${activeTab === 'scanner' ? 'bg-card text-foreground shadow-sm' : 'text-muted-fg'}`}
          >
            <Scan size={16} /> QR Code
          </button>
          <button 
            onClick={() => { setActiveTab("manual"); setResult({type: 'idle'}); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex justify-center items-center gap-2 transition ${activeTab === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-fg'}`}
          >
            <Search size={16} /> Busca Manual
          </button>
        </div>

        {activeTab === "scanner" && (
          <div className="w-full flex flex-col items-center">
            <div 
              className={`w-full bg-black rounded-xl overflow-hidden shadow-inner border-2 transition-colors duration-300 ${
                result.type === 'success' ? 'border-success' : 
                result.type === 'error' ? 'border-error' : 
                result.type === 'warning' ? 'border-warning' : 
                'border-gray-800'
              }`}
              style={{ minHeight: "300px", position: "relative" }}
            >
              <div id="reader" style={{ width: "100%", height: "100%", display: scannerActive ? 'block' : 'none' }}></div>
              {!scannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-fg bg-muted p-4 text-center">
                  <Camera size={48} className="mb-2 opacity-50" />
                  <button onClick={startScanner} className="px-4 py-2 mt-2 bg-brand text-white rounded-lg font-medium">
                    Iniciar Câmera
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 w-full min-h-[120px] flex items-center justify-center">
              {result.type === "idle" && (
                <div className="text-center text-muted-fg flex flex-col items-center animate-pulse">
                  <Scan size={32} className="mb-2" />
                  <p>Aguardando leitura...</p>
                </div>
              )}
              {result.type === "loading" && (
                <div className="text-center text-brand flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="font-medium">Validando ingresso...</p>
                </div>
              )}
              {result.type === "success" && (
                <div className="w-full bg-success/10 border border-success/30 rounded-xl p-4 text-center text-success animate-in zoom-in-95 duration-200">
                  <CheckCircle2 size={40} className="mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Acesso Liberado</h2>
                  <p className="text-sm opacity-90 mt-1">{result.data?.buyerName}</p>
                </div>
              )}
              {result.type === "error" && (
                <div className="w-full bg-error/10 border border-error/30 rounded-xl p-4 text-center text-error animate-in zoom-in-95 duration-200">
                  <XCircle size={40} className="mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Inválido</h2>
                  <p className="text-sm opacity-90 mt-1">{result.message}</p>
                </div>
              )}
              {result.type === "warning" && (
                <div className="w-full bg-warning/10 border border-warning/30 rounded-xl p-4 text-center text-warning animate-in zoom-in-95 duration-200">
                  <AlertTriangle size={40} className="mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Já Utilizado</h2>
                  <p className="text-sm opacity-90 mt-1">{result.message}</p>
                  {result.buyer && <p className="text-xs opacity-70 mt-1">Nome: {result.buyer}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="w-full flex flex-col">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por Nome, CPF ou Código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl focus:border-brand focus:outline-none"
              />
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {tickets.length === 0 && (
                <div className="text-center p-6 text-muted-fg bg-muted/50 rounded-xl">
                  Nenhum ingresso sincronizado.<br/>Clique em "Sincronizar" no topo.
                </div>
              )}
              {tickets.length > 0 && searchTerm && filteredTickets.length === 0 && (
                <div className="text-center p-6 text-muted-fg">
                  Nenhum ingresso encontrado para "{searchTerm}".
                </div>
              )}
              {filteredTickets.map(t => (
                <div key={t.id} className="p-4 border border-border rounded-xl bg-card hover:border-border/80 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      {t.participantName || t.user.name}
                    </h3>
                    <p className="text-xs text-muted-fg mt-1">CPF: {t.participantCpf || 'Não informado'}</p>
                    <p className="text-xs text-brand font-medium mt-1">{t.batch.event.title}</p>
                  </div>
                  <div>
                    {t.status === "USED" ? (
                      <span className="flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-1 rounded-md font-medium whitespace-nowrap">
                        <CheckCircle2 size={12} /> Já Utilizado
                      </span>
                    ) : (
                      <button 
                        onClick={() => processCheckin(t.qrHash)}
                        className="flex items-center gap-2 bg-success/10 text-success hover:bg-success hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
                      >
                        <UserCheck size={16} /> Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resultado do check-in manual */}
            {result.type !== "idle" && (
               <div className={`mt-4 w-full p-4 rounded-xl text-center border animate-in zoom-in-95 duration-200 ${
                 result.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 
                 result.type === 'error' ? 'bg-error/10 border-error/30 text-error' : 
                 result.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' : 
                 'bg-brand/10 border-brand/30 text-brand'
               }`}>
                 {result.type === 'loading' && 'Validando...'}
                 {result.type === 'success' && <><CheckCircle2 size={24} className="mx-auto mb-1" />Acesso Liberado: {result.data?.buyerName}</>}
                 {result.type === 'error' && <><XCircle size={24} className="mx-auto mb-1" />{result.message}</>}
                 {result.type === 'warning' && <><AlertTriangle size={24} className="mx-auto mb-1" />{result.message}</>}
               </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
