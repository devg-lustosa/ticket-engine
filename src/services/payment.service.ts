import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { toCents } from "@/lib/money";
import { generateTicketHash } from "@/lib/ticket/hash";
import type { AsaasPixCharge } from "@/lib/asaas/types";

export async function confirmPayment(id: string, charge: Pick<AsaasPixCharge, "id" | "value"> & Partial<AsaasPixCharge>, now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${id} FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (toCents(payment.amount) !== toCents(charge.value) || (payment.gatewayId && payment.gatewayId !== charge.id)) throw new ApiError(409, "Cobrança divergente do pedido.", "PAYMENT_REQUIRES_REVIEW");
    if (payment.status === "REFUNDED" || payment.status === "FAILED") throw new ApiError(409, "Pagamento requer conciliação antes da ativação.", "PAYMENT_REQUIRES_REVIEW");
    const legacy = payment.status === "PAID" && payment.paidAt === null;
    if (payment.status === "PAID" && !legacy) return [];
    await tx.payment.update({ where: { id }, data: { gatewayId: charge.id, status: "PAID", paidAt: now,
      checkoutState: "READY", stockReserved: false, couponReserved: false,
      ...(charge.netValue !== undefined ? { gatewayNetAmount: charge.netValue } : {}) } });
    const tickets = await tx.ticket.findMany({ where: { paymentId: id }, include: { user: { select: { email: true, name: true } }, batch: { include: { event: true } } } });
    const activated = [];
    for (const ticket of tickets) {
      // Do not rotate an already transferred or used QR on a repeated notification.
      if (ticket.status === "PENDING" || (legacy && ticket.status === "ACTIVE" && ticket.qrHash.startsWith("pending-"))) {
        ticket.qrHash = generateTicketHash(ticket.id, ticket.batch.eventId, ticket.userId);
        await tx.ticket.update({ where: { id: ticket.id }, data: { status: "ACTIVE", qrHash: ticket.qrHash } });
        activated.push(ticket);
      }
    }
    if (payment.couponId) await tx.coupon.update({ where: { id: payment.couponId }, data: {
      usedCount: { increment: 1 }, ...(payment.couponReserved ? { reservedCount: { decrement: 1 } } : {}),
    } });
    return activated;
  });
}

export async function releaseFailedCheckout(id: string) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${id} FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (payment.status !== "PENDING" || !payment.stockReserved) return;
    const quantities = await tx.ticket.groupBy({ by: ["batchId"], where: { paymentId: id }, _count: true, orderBy: { batchId: "asc" } });
    for (const quantity of quantities) {
      const changed = await tx.batch.updateMany({ where: { id: quantity.batchId, soldQty: { gte: quantity._count } }, data: { soldQty: { decrement: quantity._count } } });
      if (!changed.count) throw new ApiError(409, "Estoque divergente. Concilie antes de liberar.", "STOCK_REQUIRES_REVIEW");
    }
    if (payment.couponId && payment.couponReserved) await tx.coupon.update({ where: { id: payment.couponId }, data: { reservedCount: { decrement: 1 } } });
    await tx.ticket.updateMany({ where: { paymentId: id, status: "PENDING" }, data: { status: "CANCELLED" } });
    await tx.payment.update({ where: { id }, data: { status: "FAILED", checkoutState: "FAILED", stockReserved: false, couponReserved: false } });
  });
}
