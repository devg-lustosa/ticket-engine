import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, type Actor } from "@/lib/api";
import { fromCents, toCents } from "@/lib/money";
import { getCharge, refundCharge } from "@/lib/asaas/client";
import { differenceInDays, differenceInHours } from "date-fns";
import type { AsaasRefund } from "@/lib/asaas/types";

const reservedStatuses = ["STARTED", "PENDING", "UNKNOWN", "DONE"] as const;

function refundReference(record: { id: string; attempts: number }) {
  return `ticket-refund:${record.id}` + (record.attempts > 1 ? `:attempt-${record.attempts}` : "");
}

async function failRefund(id: string, attempts: number) {
  await prisma.$transaction(async tx => {
    const known = await tx.refund.findUniqueOrThrow({ where: { id } });
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${known.paymentId} FOR UPDATE`;
    const changed = await tx.refund.updateMany({ where: { id, attempts, status: { in: ["STARTED", "PENDING", "UNKNOWN"] } }, data: { status: "FAILED" } });
    if (changed.count) await tx.ticket.updateMany({ where: { id: known.ticketId, status: "CANCELLED" }, data: { status: "ACTIVE" } });
  });
}

export async function finishRefund(refundId: string, now = new Date()) {
  return prisma.$transaction(async tx => {
    const known = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${known.paymentId} FOR UPDATE`;
    const changed = await tx.refund.updateMany({ where: { id: refundId, status: { in: ["STARTED", "PENDING", "UNKNOWN"] } }, data: { status: "DONE", completedAt: now } });
    if (!changed.count) return;
    const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: known.ticketId } });
    await tx.ticket.update({ where: { id: ticket.id }, data: { status: "CANCELLED" } });
    await tx.batch.update({ where: { id: ticket.batchId }, data: { soldQty: { decrement: 1 } } });
    const total = await tx.refund.aggregate({ where: { paymentId: known.paymentId, status: "DONE" }, _sum: { amount: true } });
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: known.paymentId } });
    if (total._sum.amount?.equals(payment.amount)) await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
  });
}

export async function reconcileRefunds(paymentId: string, refunds: AsaasRefund[]) {
  const known = await prisma.refund.findMany({ where: { paymentId, status: { in: ["STARTED", "PENDING", "UNKNOWN"] } } });
  for (const record of known) {
    const remote = refunds.find(item => item.description === refundReference(record) && toCents(item.value) === toCents(record.amount));
    if (remote?.status === "DONE") await finishRefund(record.id);
    if (remote?.status === "CANCELLED") await failRefund(record.id, record.attempts);
  }
}

export async function requestTicketRefund(actor: Actor, ticketId: string, now = new Date()) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { payment: true, batch: { include: { event: true } } } });
  if (!ticket || ticket.userId !== actor.id) throw new ApiError(404, "Ingresso não encontrado.");
  if (!ticket.payment || ticket.payment.gateway !== "asaas" || !ticket.payment.gatewayId || ticket.payment.method === "FREE") throw new ApiError(400, "Ingresso sem cobrança reembolsável.");
  if (ticket.paidAmount === null) throw new ApiError(409, "Pedido antigo sem valor pago por ingresso. Concilie antes de estornar.", "LEGACY_PRICING_REQUIRES_REVIEW");
  const amount = toCents(ticket.paidAmount);
  if (!amount) throw new ApiError(400, "Ingresso sem valor pago para estornar.");
  const existing = await prisma.refund.findUnique({ where: { ticketId } });
  if (existing && existing.status !== "FAILED") return { success: true, pending: existing.status !== "DONE", refundId: existing.id, status: existing.status };
  if (differenceInDays(now, ticket.createdAt) >= 7 || differenceInHours(ticket.batch.event.date, now) < 48) throw new ApiError(400, "Reembolso fora do prazo: até 7 dias da compra e pelo menos 48h antes do evento.");
  const remote = await getCharge(ticket.payment.gatewayId);
  if (toCents(remote.originalValue ?? remote.value) !== toCents(ticket.payment.amount)) throw new ApiError(409, "Cobrança divergente. É necessário conciliar o pagamento.", "PAYMENT_REQUIRES_REVIEW");
  const reservation = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${ticket.paymentId} FOR UPDATE`;
    const current = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: { refund: true, payment: true } });
    if (current.refund && current.refund.status !== "FAILED") return { record: current.refund, claimed: false };
    if (current.status !== "ACTIVE" || current.payment?.status !== "PAID") throw new ApiError(409, "Ingresso não está disponível para reembolso.", "TICKET_NOT_ACTIVE");
    const refunds = await tx.refund.findMany({ where: { paymentId: ticket.paymentId!, status: { in: [...reservedStatuses] } } });
    const references = new Set(refunds.map(refundReference));
    const localReserved = refunds.reduce((sum, item) => sum + toCents(item.amount), 0);
    const externalReserved = (remote.refunds ?? []).filter(item => item.status !== "CANCELLED" && !references.has(item.description ?? ""))
      .reduce((sum, item) => sum + toCents(item.value), 0);
    if (localReserved + externalReserved + amount > toCents(ticket.payment!.amount)) throw new ApiError(409, "O estorno ultrapassaria o saldo da cobrança.", "REFUND_BALANCE_EXCEEDED");
    // Reserving the ticket before HTTP also excludes a concurrent check-in.
    const claimed = await tx.ticket.updateMany({ where: { id: ticketId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
    if (claimed.count !== 1) throw new ApiError(409, "Ingresso alterado por outra operação.", "TICKET_CONFLICT");
    const record = await tx.refund.upsert({ where: { ticketId }, create: { ticketId, paymentId: ticket.paymentId!, amount: new Prisma.Decimal(fromCents(amount)), status: "STARTED" },
      update: { status: "STARTED", attempts: { increment: 1 }, requestedAt: now } });
    return { record, claimed: true };
  });
  if (!reservation.claimed) return { success: true, pending: reservation.record.status !== "DONE", refundId: reservation.record.id, status: reservation.record.status };
  const id = reservation.record.id;
  let response;
  try {
    response = await refundCharge(ticket.payment.gatewayId, amount / 100, refundReference(reservation.record));
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    const rejected = status !== undefined && status >= 400 && status < 500 && ![408, 409, 429].includes(status);
    if (rejected) {
      await failRefund(id, reservation.record.attempts);
      throw new ApiError(400, "Estorno recusado pelo gateway. O ingresso permanece ativo.", "REFUND_REJECTED");
    }
    await prisma.refund.updateMany({ where: { id, status: "STARTED" }, data: { status: "UNKNOWN" } });
    return { success: true, pending: true, refundId: id, status: "UNKNOWN" };
  }
  const item = response.refunds?.find((entry: AsaasRefund) => entry.description === refundReference(reservation.record) && toCents(entry.value) === amount);
  if (item?.status === "CANCELLED") { await failRefund(id, reservation.record.attempts); throw new ApiError(400, "Estorno cancelado pelo gateway. O ingresso permanece ativo.", "REFUND_REJECTED"); }
  if (item?.status === "DONE") await finishRefund(id, now);
  else await prisma.refund.updateMany({ where: { id, status: "STARTED" }, data: { status: item?.status === "PENDING" ? "PENDING" : "UNKNOWN" } });
  const final = await prisma.refund.findUniqueOrThrow({ where: { id } });
  return { success: true, pending: final.status !== "DONE", refundId: id, status: final.status };
}
