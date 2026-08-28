import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== dbUser.id) {
      return NextResponse.json({ error: "Evento não encontrado ou acesso negado" }, { status: 404 });
    }

    const body = await request.json();
    const { code, discountType, discountValue, maxUses, validUntil } = body;

    if (!code || !discountType || !discountValue) {
      return NextResponse.json({ error: "Código, tipo e valor são obrigatórios" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim().replace(/\s+/g, '');

    // Verifica se já existe
    const existing = await prisma.coupon.findUnique({
      where: { eventId_code: { eventId, code: cleanCode } }
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe um cupom com este código para este evento" }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        eventId,
        discountType,
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json({ error: "Erro interno ao criar cupom" }, { status: 500 });
  }
}
