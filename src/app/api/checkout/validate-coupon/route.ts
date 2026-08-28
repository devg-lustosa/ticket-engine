import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { code, eventId } = await request.json();

    if (!code || !eventId) {
      return NextResponse.json({ error: "Código e ID do evento são obrigatórios" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim().replace(/\s+/g, '');

    const coupon = await prisma.coupon.findUnique({
      where: { eventId_code: { eventId, code: cleanCode } }
    });

    if (!coupon) {
      return NextResponse.json({ error: "Cupom inválido ou não encontrado" }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ error: "Este cupom está inativo" }, { status: 400 });
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return NextResponse.json({ error: "Este cupom está expirado" }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Este cupom atingiu o limite de usos" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue)
      }
    });

  } catch (error: any) {
    console.error("Erro ao validar cupom:", error);
    return NextResponse.json({ error: "Erro interno ao validar cupom" }, { status: 500 });
  }
}
