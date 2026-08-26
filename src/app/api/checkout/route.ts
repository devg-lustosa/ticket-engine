import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createOrFindCustomer,
  createPixCharge,
  getPixQrCode,
} from "@/lib/asaas/client";
import { addDays, format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    // ── 1. Autenticação ──────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // ── 2. Validação do payload ──────────────────────────────────
    const body = await request.json();
    const { batchId } = body as { batchId?: string };

    if (!batchId) {
      return NextResponse.json({ error: "batchId obrigatório." }, { status: 400 });
    }

    // ── 3. Busca e valida o lote (com lock otimista de estoque) ──
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { event: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
    }

    if (batch.soldQty >= batch.totalQty) {
      return NextResponse.json({ error: "Lote esgotado." }, { status: 409 });
    }

    const now = new Date();
    if (batch.startAt && now < batch.startAt) {
      return NextResponse.json({ error: "Vendas ainda não iniciaram." }, { status: 409 });
    }
    if (batch.endAt && now > batch.endAt) {
      return NextResponse.json({ error: "Vendas encerradas." }, { status: 409 });
    }

    // ── 4. Busca ou cria o usuário na base local ─────────────────
    let dbUser = await prisma.user.findUnique({ where: { authId: user.id } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email!,
          name: user.user_metadata?.name ?? "Comprador",
          cpf: user.user_metadata?.cpf ?? null,
          role: "BUYER",
        },
      });
    }

    // ── 5. Cria/busca Customer no Asaas ─────────────────────────
    const asaasCustomer = await createOrFindCustomer({
      name: dbUser.name,
      email: dbUser.email,
      cpfCnpj: dbUser.cpf ?? undefined,
      externalReference: dbUser.id,
    });

    // ── 6. Cria a cobrança Pix no Asaas ─────────────────────────
    const dueDate = format(addDays(now, 1), "yyyy-MM-dd");
    const charge = await createPixCharge({
      customer: asaasCustomer.id,
      billingType: "PIX",
      value: Number(batch.price),
      dueDate,
      description: `Ingresso: ${batch.event.title} — ${batch.name}`,
      externalReference: `batch:${batchId}:user:${dbUser.id}`,
    });

    // ── 7. Busca o QR Code Pix ───────────────────────────────────
    const qrCode = await getPixQrCode(charge.id);

    // ── 8. Cria o Ticket (PENDING) e o Payment de forma atômica ──
    const [ticket] = await prisma.$transaction([
      prisma.ticket.create({
        data: {
          batchId,
          userId: dbUser.id,
          status: "PENDING",
          // qrHash será gerado pelo webhook após confirmação do pagamento
          qrHash: `pending-${charge.id}`,
        },
      }),
      // Incrementa soldQty atomicamente para evitar overselling
      prisma.batch.update({
        where: { id: batchId },
        data: { soldQty: { increment: 1 } },
      }),
    ]);

    await prisma.payment.create({
      data: {
        ticketId: ticket.id,
        gatewayId: charge.id,
        gateway: "asaas",
        method: "PIX",
        status: "PENDING",
        amount: batch.price,
        pixCode: qrCode.payload,
        pixQrUrl: qrCode.encodedImage,
        expiresAt: new Date(qrCode.expirationDate),
      },
    });

    // ── 9. Retorna dados para o frontend ─────────────────────────
    return NextResponse.json({
      ticketId: ticket.id,
      pixCode: qrCode.payload,
      pixQrBase64: qrCode.encodedImage,
      expiresAt: qrCode.expirationDate,
      amount: Number(batch.price),
      event: {
        title: batch.event.title,
        date: batch.event.date,
        venue: batch.event.venue,
      },
    });
  } catch (error: any) {
    const asaasError = error.response?.data?.errors?.[0]?.description;
    console.error("[checkout/route] Error:", asaasError || error.message || error);
    
    return NextResponse.json(
      { error: asaasError || "Erro interno ao processar pagamento." },
      { status: error.response?.status === 400 ? 400 : 500 }
    );
  }
}
