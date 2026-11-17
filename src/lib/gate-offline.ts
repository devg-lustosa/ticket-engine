export type PendingCheckin = { id: string; eventId: string; qrHash: string; at: string; state: "PENDING" | "CONFLICT"; message?: string };
export type GateJournal = { used: string[]; queue: PendingCheckin[] };

export function appendOfflineEntry(journal: GateJournal, ticketId: string, entry: PendingCheckin): GateJournal {
  if (journal.used.includes(ticketId)) throw new Error("Ingresso já registrado neste aparelho.");
  return { used: [...journal.used, ticketId], queue: [...journal.queue, entry] };
}

export function gateStorageKey(actorId: string, eventId: string): string {
  return `portaria:v2:${actorId}:${eventId}`;
}

export function canReplay(entry: Pick<PendingCheckin, "eventId" | "state">, eventId: string): boolean {
  return entry.eventId === eventId && entry.state === "PENDING";
}
