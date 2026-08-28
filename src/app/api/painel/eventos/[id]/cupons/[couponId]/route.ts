import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function verifyAccess(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") return null;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.organizerId !== dbUser.id) return null;

  return dbUser;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; couponId: string }> }
) {
  try {
    const { id: eventId, couponId } = await params;
    const access = await verifyAccess(eventId);
    if (!access) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    await prisma.coupon.delete({
      where: { id: couponId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir cupom:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; couponId: string }> }
) {
  try {
    const { id: eventId, couponId } = await params;
    const access = await verifyAccess(eventId);
    if (!access) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: { active: !coupon.active }
    });

    return NextResponse.json({ success: true, active: updated.active });
  } catch (error: any) {
    console.error("Erro ao alterar cupom:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
