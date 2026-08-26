import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTicketHash } from "@/lib/ticket/hash";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";

export async function POST(request: NextRequest) {
  try {
    // ── 1. Valida o token secreto do webhook ─────────────────────
    const token = request.headers.get("asaas-access-token");
    if (token !== process.env.ASAAS_WEBHOOK_SECRET) {
      console.warn("[webhook/asaas] Token inválido recebido.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as AsaasWebhookPayload;
    const { event, payment } = payload;

    console.log(`[webhook/asaas] Evento recebido: ${event} | ID: ${payment.id}`);

    // ── 2. Só processa eventos de pagamento confirmado ────────────
    const isConfirmed =
      event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";

    if (!isConfirmed) {
      return NextResponse.json({ received: true });
    }

    // ── 3. Idempotência — verifica se já foi processado ───────────
    const existingPayment = await prisma.payment.findUnique({
      where: { gatewayId: payment.id },
      include: { ticket: { include: { batch: { include: { event: true } } } } },
    });

    if (!existingPayment) {
      console.warn(`[webhook/asaas] Pagamento ${payment.id} não encontrado.`);
      return NextResponse.json({ received: true });
    }

    if (existingPayment.status === "PAID") {
      // Já processado — retorna 200 para o Asaas não re-tentar
      console.log(`[webhook/asaas] Pagamento ${payment.id} já processado (idempotente).`);
      return NextResponse.json({ received: true });
    }

    // ── 4. Gera o qrHash seguro do ingresso ───────────────────────
    const ticket = existingPayment.ticket;
    const eventId = ticket.batch.eventId;
    const qrHash = generateTicketHash(ticket.id, eventId, ticket.userId);

    // ── 5. Atualiza Payment e Ticket atomicamente ─────────────────
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "PAID",
          paidAt: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "ACTIVE",
          qrHash,
        },
      }),
    ]);

    console.log(`[webhook/asaas] ✅ Ingresso ${ticket.id} ativado com sucesso.`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook/asaas] Erro:", error);
    // Retorna 500 para o Asaas re-tentar o webhook
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
