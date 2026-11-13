import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, assertSameOrigin, jsonBody, requireActor, uuid } from "@/lib/api";
import { generateTicketHash } from "@/lib/ticket/hash";
import { sendTicketEmail } from "@/services/email.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor(["ORGANIZER"]);
    const eventId = uuid((await params).id);
    const body = await jsonBody(request);
    const batchId = uuid(body.batchId, "Lote"), quantity = Number(body.quantity);
    const name = typeof body.name === "string" ? body.name.trim() : "", email = typeof body.email === "string" ? body.email.trim() : "";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || name.length < 3 || name.length > 160 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Informe de 1 a 10 cortesias, nome e e-mail válidos.");
    const event = await prisma.event.findFirst({ where: { id: eventId, organizerId: actor.id } });
    if (!event) throw new ApiError(404, "Evento não encontrado.");
    const tickets = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM batches WHERE id = ${batchId} FOR UPDATE`;
      const batch = await tx.batch.findFirst({ where: { id: batchId, eventId } });
      if (!batch) throw new ApiError(400, "Lote inválido para este evento.");
      if (quantity > batch.totalQty - batch.soldQty) throw new ApiError(409, "O lote não possui capacidade para estas cortesias.");
      const payment = await tx.payment.create({ data: { gateway: "manual", gatewayId: "FREE_" + randomUUID(), method: "FREE", status: "PAID", amount: 0, paidAt: new Date(), platformFeeBps: 0 } });
      const issued = Array.from({ length: quantity }, () => {
        const id = randomUUID();
        return { id, batchId, userId: actor.id, paymentId: payment.id, participantName: name, participantCpf: "", status: "ACTIVE" as const, unitPrice: batch.price, paidAmount: 0, qrHash: generateTicketHash(id, eventId, actor.id) };
      });
      await tx.ticket.createMany({ data: issued });
      await tx.batch.update({ where: { id: batchId }, data: { soldQty: { increment: quantity } } });
      return issued;
    });
    for (const ticket of tickets) await sendTicketEmail(email, { participantName: name, eventName: event.title,
      eventDate: format(event.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), venue: event.venue, qrHash: ticket.qrHash });
    return NextResponse.json({ success: true, quantity: tickets.length });
  } catch (error) { return apiError(error); }
}
