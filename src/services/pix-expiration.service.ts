import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { toCents } from "@/lib/money";
import { cancelCharge, getCharge } from "@/lib/asaas/client";
import { confirmPayment, releaseFailedCheckout } from "@/services/payment.service";
import { notifyPaidTickets } from "@/services/checkout.service";

export async function reconcileExpiredPix(paymentId: string, event: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.method !== "PIX" || payment.status !== "PENDING" || !payment.gatewayId) return;
  const remote = await getCharge(payment.gatewayId);
  if (remote.id !== payment.gatewayId || toCents(remote.originalValue ?? remote.value) !== toCents(payment.amount)) throw new ApiError(409, "Pix divergente. Conciliação necessária.", "PAYMENT_REQUIRES_REVIEW");
  if (["RECEIVED", "CONFIRMED"].includes(remote.status)) {
    await notifyPaidTickets(await confirmPayment(payment.id, remote));
    return;
  }
  if (!payment.stockReserved) throw new ApiError(409, "Reserva antiga sem controle de estoque. Concilie antes de liberar.", "LEGACY_RESERVATION_REQUIRES_REVIEW");
  let cancelled = remote.deleted === true;
  if (!cancelled && event === "PAYMENT_OVERDUE" && remote.status === "OVERDUE") {
    try {
      const result = await cancelCharge(payment.gatewayId);
      cancelled = result.id === payment.gatewayId && result.deleted === true;
    } catch {
      // Sem confirmação de cancelamento o QR ainda pode receber dinheiro.
      throw new ApiError(503, "Não foi possível confirmar o cancelamento do Pix. Reenvie a notificação.", "PIX_CANCELLATION_PENDING");
    }
  }
  if (!cancelled) throw new ApiError(503, "A cobrança ainda não está cancelada. Reenvie a notificação.", "PIX_CANCELLATION_PENDING");
  await releaseFailedCheckout(payment.id);
}
