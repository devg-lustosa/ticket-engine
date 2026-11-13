import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";
import { confirmPayment } from "@/services/payment.service";
import { reconcileRefunds } from "@/services/refund.service";
import { reconcileExpiredPix } from "@/services/pix-expiration.service";
import { notifyPaidTickets } from "@/services/checkout.service";
import { getCharge } from "@/lib/asaas/client";
import type { AsaasPixCharge } from "@/lib/asaas/types";

export async function POST(request: Request) {
  try {
    const expected = process.env.ASAAS_WEBHOOK_SECRET;
    const received = request.headers.get("asaas-access-token");
    if (!expected || !received || received.length > 512 || !timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(received).digest())) throw new ApiError(401, "Não autorizado.");
    const body = await jsonBody(request);
    if (typeof body.event !== "string" || !body.payment || typeof body.payment !== "object") throw new ApiError(400, "Webhook inválido.");
    const charge = body.payment as AsaasPixCharge;
    if (typeof charge.id !== "string" || !/^[\w-]{1,128}$/.test(charge.id)) throw new ApiError(400, "Cobrança inválida.");
    const reference = typeof charge.externalReference === "string" && /^ticket-engine:[\da-f-]{36}$/i.test(charge.externalReference) ? charge.externalReference.slice(14) : null;
    const payment = await prisma.payment.findFirst({ where: { OR: [{ gatewayId: charge.id }, ...(reference ? [{ id: reference }] : [])] } });
    if (!payment) {
      if (reference) throw new ApiError(503, "Pedido ainda não localizado. Reenvie a notificação.");
      return NextResponse.json({ received: true });
    }
    if (body.event === "PAYMENT_CONFIRMED" || body.event === "PAYMENT_RECEIVED") {
      try { toCents(charge.value); } catch { throw new ApiError(400, "Valor do webhook inválido."); }
      await notifyPaidTickets(await confirmPayment(payment.id, charge));
    }
    if (body.event === "PAYMENT_OVERDUE" || body.event === "PAYMENT_DELETED") await reconcileExpiredPix(payment.id, body.event);
    if (["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS"].includes(body.event)) {
      const remote = await getCharge(charge.id);
      await reconcileRefunds(payment.id, remote.refunds ?? []);
    }
    return NextResponse.json({ received: true });
  } catch (error) { return apiError(error); }
}
