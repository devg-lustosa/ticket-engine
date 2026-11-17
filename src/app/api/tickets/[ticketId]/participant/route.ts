import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, assertSameOrigin, jsonBody, requireActor, uuid } from "@/lib/api";
import { isValidCPF } from "@/lib/cpf";
import { generateTicketHash } from "@/lib/ticket/hash";
import { sendTicketEmail } from "@/services/email.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor();
    const ticketId = uuid((await params).ticketId);
    const body = await jsonBody(request);
    const participantName = typeof body.participantName === "string" ? body.participantName.trim() : "";
    const participantCpf = typeof body.participantCpf === "string" ? body.participantCpf.replace(/\D/g, "") : "";
    const participantEmail = typeof body.participantEmail === "string" ? body.participantEmail.trim() : "";
    if (participantName.length < 3 || participantName.length > 160 || !isValidCPF(participantCpf) || participantEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) throw new ApiError(400, "Informe nome, CPF válido e e-mail do participante.");
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, userId: actor.id }, include: { batch: { include: { event: true } } } });
    if (!ticket) throw new ApiError(404, "Ingresso não encontrado.");
    if (ticket.status !== "ACTIVE") throw new ApiError(409, "Somente um ingresso ativo pode ser transferido.");
    if (ticket.isParticipantEdited) throw new ApiError(409, "Este ingresso já foi transferido uma vez.");
    if (ticket.batch.event.date.getTime() - Date.now() < 24 * 60 * 60 * 1000) throw new ApiError(403, "A transferência só é permitida até 24 horas antes do evento.");
    const qrHash = generateTicketHash(ticket.id + "-transfer-" + randomUUID(), ticket.batch.eventId, actor.id);
    const updated = await prisma.ticket.updateMany({ where: { id: ticket.id, userId: actor.id, status: "ACTIVE", isParticipantEdited: false }, data: { participantName, participantCpf, qrHash, isParticipantEdited: true } });
    if (!updated.count) throw new ApiError(409, "O ingresso foi utilizado, transferido ou cancelado durante a solicitação.");
    await sendTicketEmail(participantEmail, { participantName, eventName: ticket.batch.event.title,
      eventDate: format(ticket.batch.event.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), venue: ticket.batch.event.venue, qrHash });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
