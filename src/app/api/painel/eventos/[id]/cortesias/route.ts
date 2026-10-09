import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateTicketHash } from "@/lib/ticket/hash";
import { sendTicketEmail } from "@/services/email.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const { quantity, name, email, batchId } = body;

    if (!quantity || !name || !email || !batchId) {
      return NextResponse.json({ error: "Campos incompletos." }, { status: 400 });
    }

    // Validate event belongs to organizer
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: dbUser.id },
      include: { batches: true }
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    const validBatch = event.batches.find(b => b.id === batchId);
    if (!validBatch) return NextResponse.json({ error: "Lote inválido" }, { status: 400 });

    const processedTickets: any[] = [];

    // Create payment and tickets
    await prisma.$transaction(async (tx) => {
      // Cria um payment grátis
      const payment = await tx.payment.create({
        data: {
          gateway: "manual",
          gatewayId: "FREE_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
          method: "FREE",
          status: "PAID",
          amount: 0,
          paidAt: new Date(),
        }
      });

      for (let i = 0; i < quantity; i++) {
        // Create ticket initially to get the UUID, then update with hash
        const ticket = await tx.ticket.create({
          data: {
            batchId,
            userId: dbUser.id, // vincula a cortesia ao organizador
            paymentId: payment.id,
            participantName: name,
            participantCpf: "", // ingressos grátis não exigem CPF obrigatório nesta regra
            status: "ACTIVE",
            qrHash: "temp",
          }
        });

        const qrHash = generateTicketHash(ticket.id, eventId, dbUser.id);
        
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { qrHash }
        });

        processedTickets.push({
           ...ticket,
           qrHash,
        });
      }
      
      // Update batch sold qty
      await tx.batch.update({
        where: { id: batchId },
        data: { soldQty: { increment: quantity } }
      });
    });

    // Send emails
    const formattedDate = format(
      new Date(event.date),
      "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    for (const ticket of processedTickets) {
      try {
        await sendTicketEmail(email, {
          participantName: name,
          eventName: event.title,
          eventDate: formattedDate,
          venue: event.venue,
          qrHash: ticket.qrHash,
        });
      } catch (err) {
        console.error(`Erro ao enviar cortesia para ${email}:`, err);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[api/cortesias] Erro:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
