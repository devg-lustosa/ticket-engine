import { prisma } from "@/lib/prisma";
import { ApiError, type Actor } from "@/lib/api";

export async function gateEvent(actor: Actor, eventId: string) {
  const event = await prisma.event.findFirst({ where: {
    id: eventId, status: "PUBLISHED",
    ...(actor.role === "ORGANIZER" ? { organizerId: actor.id } : {}),
  }, select: { id: true, title: true, date: true } });
  if (!event) throw new ApiError(404, "Evento não disponível para esta portaria.", "EVENT_NOT_AVAILABLE");
  return event;
}

export async function performCheckin(actor: Actor, eventId: string, qrHash: string) {
  await gateEvent(actor, eventId);
  const short = qrHash.length === 8;
  const tickets = await prisma.ticket.findMany({ where: {
    ...(short ? { id: { startsWith: qrHash.toLowerCase() } } : { qrHash }),
    ...(actor.role === "ORGANIZER" ? { batch: { event: { organizerId: actor.id } } } : {}),
  }, take: 2, select: {
    id: true, status: true, usedAt: true, participantName: true,
    batch: { select: { name: true, eventId: true, event: { select: { title: true } } } },
  } });
  if (!tickets.length) throw new ApiError(404, "Ingresso não encontrado ou inválido.", "TICKET_NOT_FOUND");
  if (tickets.length > 1) throw new ApiError(409, "Código ambíguo. Use o QR completo.", "AMBIGUOUS_CODE");
  const ticket = tickets[0];
  if (ticket.batch.eventId !== eventId) throw new ApiError(409, `Ingresso inválido para este evento (Válido para: ${ticket.batch.event.title})`, "WRONG_EVENT");
  if (ticket.status !== "ACTIVE") throw new ApiError(409, ticket.status === "USED" ? "Ingresso já utilizado." : ticket.status === "PENDING" ? "Pagamento não confirmado." : "Ingresso cancelado.", ticket.status === "USED" ? "ALREADY_USED" : "TICKET_NOT_ACTIVE");
  const usedAt = new Date();
  const consumed = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "ACTIVE", batch: { eventId, event: { status: "PUBLISHED" } } },
    data: { status: "USED", usedAt, checkedBy: actor.id },
  });
  if (consumed.count !== 1) throw new ApiError(409, "Ingresso já utilizado ou indisponível.", "CHECKIN_CONFLICT");
  return { id: ticket.id, buyerName: ticket.participantName, batchName: ticket.batch.name, eventName: ticket.batch.event.title, usedAt };
}
