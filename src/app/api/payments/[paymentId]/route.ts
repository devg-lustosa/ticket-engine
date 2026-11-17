import { NextResponse } from "next/server";
import { apiError, requireActor, uuid, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getPixQrCode } from "@/lib/asaas/client";

export async function GET(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const actor = await requireActor();
    const id = uuid((await params).paymentId, "Pedido");
    let payment = await prisma.payment.findFirst({ where: { id, tickets: { some: { userId: actor.id } } } });
    if (!payment) throw new ApiError(404, "Pedido não encontrado.");
    if (payment.method === "PIX" && payment.status === "PENDING" && payment.checkoutState === "READY" && payment.gatewayId && !payment.pixCode) {
      const qr = await getPixQrCode(payment.gatewayId);
      payment = await prisma.payment.update({ where: { id }, data: { pixCode: qr.payload, pixQrUrl: qr.encodedImage, expiresAt: new Date(qr.expirationDate) } });
    }
    return NextResponse.json({ success: true, paymentId: id, status: payment.status, paymentMethod: payment.method,
      pending: payment.checkoutState === "CREATING" || payment.checkoutState === "UNKNOWN" || (payment.method === "CREDIT_CARD" && payment.status === "PENDING"), pixCode: payment.pixCode, pixQrBase64: payment.pixQrUrl },
    { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
