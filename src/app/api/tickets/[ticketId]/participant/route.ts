import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isBefore, subHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateTicketHash } from "@/lib/ticket/hash";
import { sendTicketEmail } from "@/services/email.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const participantName = body.participantName as string;
    const participantCpf = body.participantCpf as string;
    const participantEmail = body.participantEmail as string;

    if (!participantName || !participantCpf || !participantEmail) {
      return NextResponse.json({ error: "Nome, CPF e E-mail são obrigatórios" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: { include: { event: true } },
        user: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ingresso não encontrado" }, { status: 404 });
    }

    if (ticket.user.authId !== user.id) {
      return NextResponse.json({ error: "Você não tem permissão para editar este ingresso" }, { status: 403 });
    }

    if (ticket.isParticipantEdited) {
      return NextResponse.json({ error: "Este ingresso já foi editado. Só é permitida 1 transferência por ingresso." }, { status: 403 });
    }

    // Verifica antecedência de 24 horas
    const eventDate = ticket.batch.event.date;
    const limitDate = subHours(eventDate, 24);
    const now = new Date();

    if (isBefore(limitDate, now)) {
      return NextResponse.json({ error: "A transferência só é permitida até 24 horas antes do início do evento." }, { status: 403 });
    }

    // Gerar um novo hash (o salt extra invalida a leitura do QR antigo na portaria)
    const newQrHash = generateTicketHash(`${ticket.id}-transfer-${Date.now()}`, ticket.batch.eventId, ticket.userId);

    // Realiza a alteração
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        participantName,
        participantCpf,
        qrHash: newQrHash,
        isParticipantEdited: true,
      },
    });

    // Enviar e-mail para o novo dono
    const formattedDate = format(
      new Date(ticket.batch.event.date),
      "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    try {
      await sendTicketEmail(participantEmail, {
        participantName,
        eventName: ticket.batch.event.title,
        eventDate: formattedDate,
        venue: ticket.batch.event.venue,
        qrHash: newQrHash,
      });
    } catch (err) {
      console.error(`Erro ao enviar ingresso transferido para ${participantEmail}:`, err);
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error("[PATCH /api/tickets/participant]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
