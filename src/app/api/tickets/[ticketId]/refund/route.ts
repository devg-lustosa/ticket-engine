import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { refundCharge } from "@/lib/asaas/client";
import { differenceInDays, differenceInHours } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // 2. Fetch ticket with related data
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: {
          include: { event: true },
        },
        payment: true,
        user: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ingresso não encontrado." }, { status: 404 });
    }

    if (ticket.user.authId !== user.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    if (ticket.status !== "ACTIVE") {
      return NextResponse.json({ error: "Ingresso não está ativo para reembolso." }, { status: 400 });
    }

    if (!ticket.payment || !ticket.payment.gatewayId) {
      return NextResponse.json({ error: "Nenhum pagamento Asaas vinculado a este ingresso." }, { status: 400 });
    }

    // 3. Business Rules Validation
    const now = new Date();
    const purchaseDate = ticket.createdAt;
    const eventDate = ticket.batch.event.date;

    const daysSincePurchase = differenceInDays(now, purchaseDate);
    const hoursToEvent = differenceInHours(eventDate, now);

    if (daysSincePurchase >= 7) {
      return NextResponse.json(
        { error: "O prazo de 7 dias para reembolso expirou." },
        { status: 400 }
      );
    }

    if (hoursToEvent < 48) {
      return NextResponse.json(
        { error: "Reembolso indisponível: Faltam menos de 48h para o evento." },
        { status: 400 }
      );
    }

    // 4. Process Refund on Asaas
    const refundValue = Number(ticket.batch.price);

    try {
      // Importante: No Asaas, o valor do estorno não precisa ser passado se for total, 
      // mas como pode ser um carrinho com múltiplos ingressos, passamos o valor unitário
      // para forçar o estorno parcial.
      await refundCharge(
        ticket.payment.gatewayId,
        refundValue,
        `Estorno do ingresso ${ticket.id.split("-")[0].toUpperCase()}`
      );
    } catch (asaasError: any) {
      const msg = asaasError.response?.data?.errors?.[0]?.description || asaasError.message;
      console.error("[refund] Asaas error:", msg);
      return NextResponse.json(
        { error: `Erro na plataforma de pagamento: ${msg}` },
        { status: 400 }
      );
    }

    // 5. Update Database
    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "CANCELLED" },
      }),
      prisma.batch.update({
        where: { id: ticket.batchId },
        data: { soldQty: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[refund] Error:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar reembolso." },
      { status: 500 }
    );
  }
}
