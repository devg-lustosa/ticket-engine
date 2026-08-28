import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createOrFindCustomer,
  createPixCharge,
  getPixQrCode,
  createCreditCardCharge
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
    const { tickets, paymentMethod, creditCardInfo } = body as { 
      tickets: { batchId: string, participantName: string, participantCpf: string }[],
      paymentMethod: "PIX" | "CREDIT_CARD",
      creditCardInfo?: { holderName: string, number: string, expiryMonth: string, expiryYear: string, ccv: string, installmentCount: number }
    };

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: "Nenhum ingresso selecionado." }, { status: 400 });
    }

    if (paymentMethod === "CREDIT_CARD" && !creditCardInfo) {
      return NextResponse.json({ error: "Informações do cartão são obrigatórias." }, { status: 400 });
    }

    // ── 3. Busca e valida os lotes (estoque otimista) ───────────
    const batchIds = [...new Set(tickets.map(t => t.batchId))];
    const batches = await prisma.batch.findMany({
      where: { id: { in: batchIds } },
      include: { event: true },
    });

    if (batches.length !== batchIds.length) {
      return NextResponse.json({ error: "Um ou mais lotes não encontrados." }, { status: 404 });
    }

    let totalAmount = 0;
    const now = new Date();
    
    // Check limits for each batch
    for (const batch of batches) {
      const requestedQty = tickets.filter(t => t.batchId === batch.id).length;
      
      if (batch.soldQty + requestedQty > batch.totalQty) {
        return NextResponse.json({ error: `Lote ${batch.name} esgotado ou sem quantidade suficiente.` }, { status: 409 });
      }
      if (batch.startAt && now < batch.startAt) {
        return NextResponse.json({ error: "Vendas ainda não iniciaram." }, { status: 409 });
      }
      if (batch.endAt && now > batch.endAt) {
        return NextResponse.json({ error: "Vendas encerradas." }, { status: 409 });
      }
      
      totalAmount += (Number(batch.price) * requestedQty);
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

    // Atualiza o CPF se o usuário ainda não tinha
    if (!dbUser.cpf && tickets[0]?.participantCpf) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { cpf: tickets[0].participantCpf }
      });
    }

    // ── 5. Cria/busca Customer no Asaas ─────────────────────────
    const asaasCustomer = await createOrFindCustomer({
      name: dbUser.name,
      email: dbUser.email,
      cpfCnpj: dbUser.cpf ?? undefined,
      externalReference: dbUser.id,
    });

    // ── 6. Cria a cobrança no Asaas ─────────────────────────────
    const dueDate = format(addDays(now, 1), "yyyy-MM-dd");
    let charge;
    
    if (paymentMethod === "CREDIT_CARD" && creditCardInfo) {
      charge = await createCreditCardCharge({
        customer: asaasCustomer.id,
        billingType: "CREDIT_CARD",
        value: totalAmount,
        dueDate,
        description: `Compra de Ingressos - ${batches[0].event.title} e outros`,
        externalReference: `user:${dbUser.id}:${Date.now()}`,
        installmentCount: creditCardInfo.installmentCount,
        installmentValue: totalAmount / creditCardInfo.installmentCount,
        creditCard: {
          holderName: creditCardInfo.holderName,
          number: creditCardInfo.number,
          expiryMonth: creditCardInfo.expiryMonth,
          expiryYear: creditCardInfo.expiryYear,
          ccv: creditCardInfo.ccv
        },
        creditCardHolderInfo: {
          name: dbUser.name,
          email: dbUser.email,
          cpfCnpj: dbUser.cpf || "00000000000",
          postalCode: "01001-000",
          addressNumber: "1",
          addressComplement: null,
          phone: dbUser.phone || "11999999999",
          mobilePhone: dbUser.phone || "11999999999",
        }
      });
    } else {
      charge = await createPixCharge({
        customer: asaasCustomer.id,
        billingType: "PIX",
        value: totalAmount,
        dueDate,
        description: `Compra de Ingressos - ${batches[0].event.title} e outros`,
        externalReference: `user:${dbUser.id}:${Date.now()}`,
      });
    }

    // ── 7. Busca o QR Code Pix (se for Pix) ─────────────────────
    let pixQr = null;
    if (paymentMethod === "PIX") {
      pixQr = await getPixQrCode(charge.id);
      console.log("[checkout/route] Pix QR response:", pixQr);
    }

    // ── 8. Cria os Ingressos e o Pagamento ───────────────────────
    await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          gatewayId: charge.id,
          gateway: "asaas",
          method: paymentMethod,
          status: charge.status === "CONFIRMED" || charge.status === "RECEIVED" ? "PAID" : "PENDING",
          amount: totalAmount,
          pixCode: pixQr?.payload,
          pixQrUrl: pixQr?.encodedImage,
          expiresAt: pixQr?.expirationDate ? new Date(pixQr.expirationDate) : null,
        },
      });

      // Create tickets
      for (const t of tickets) {
        await tx.ticket.create({
          data: {
            batchId: t.batchId,
            userId: dbUser.id,
            paymentId: payment.id,
            participantName: t.participantName,
            participantCpf: t.participantCpf,
            status: payment.status === "PAID" ? "ACTIVE" : "PENDING",
            qrHash: `pending-${payment.id}-${Math.random().toString(36).substring(7)}`, // Temporário até pagamento
          },
        });
      }

      // Increment batch sold quantities
      for (const batch of batches) {
        const requestedQty = tickets.filter(t => t.batchId === batch.id).length;
        await tx.batch.update({
          where: { id: batch.id },
          data: { soldQty: { increment: requestedQty } },
        });
      }
    });

    console.log("[checkout/route] Final response:", { success: true, paymentMethod, pixCode: !!pixQr?.payload });

    // ── 9. Retorna sucesso para o frontend ───────────────────────
    return NextResponse.json({ 
      success: true, 
      paymentMethod,
      pixCode: pixQr?.payload,
      pixQrBase64: pixQr?.encodedImage
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
