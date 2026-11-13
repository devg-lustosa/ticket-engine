import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, assertSameOrigin, requireActor, uuid } from "@/lib/api";

type Context = { params: Promise<{ id: string; couponId: string }> };
async function couponForActor(request: Request, context: Context) {
  assertSameOrigin(request);
  const actor = await requireActor(["ORGANIZER"]);
  const { id, couponId } = await context.params;
  const coupon = await prisma.coupon.findFirst({ where: { id: uuid(couponId), eventId: uuid(id), event: { organizerId: actor.id } } });
  if (!coupon) throw new ApiError(404, "Cupom não encontrado neste evento.");
  return coupon;
}

export async function DELETE(request: Request, context: Context) {
  try {
    const coupon = await couponForActor(request, context);
    // Pagamentos preservam o cupom como parte do histórico financeiro.
    if (await prisma.payment.count({ where: { couponId: coupon.id } })) throw new ApiError(409, "Este cupom possui pedidos. Desative-o para preservar o histórico.");
    const removed = await prisma.coupon.deleteMany({ where: { id: coupon.id, eventId: coupon.eventId, payments: { none: {} } } });
    if (!removed.count) throw new ApiError(409, "O cupom recebeu um pedido. Desative-o.");
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const coupon = await couponForActor(request, context);
    const updated = await prisma.coupon.update({ where: { id: coupon.id, eventId: coupon.eventId }, data: { active: !coupon.active } });
    return NextResponse.json({ success: true, active: updated.active });
  } catch (error) { return apiError(error); }
}
