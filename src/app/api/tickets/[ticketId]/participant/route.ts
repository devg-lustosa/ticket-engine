import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isBefore, subHours } from "date-fns";

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

    if (!participantName || !participantCpf) {
      return NextResponse.json({ error: "Nome e CPF são obrigatórios" }, { status: 400 });
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
      return NextResponse.json({ error: "Este ingresso já foi editado. Só é permitida 1 alteração por ingresso." }, { status: 403 });
    }

    // Verifica antecedência de 24 horas
    const eventDate = ticket.batch.event.date;
    const limitDate = subHours(eventDate, 24);
    const now = new Date();

    if (isBefore(limitDate, now)) {
      return NextResponse.json({ error: "A edição só é permitida até 24 horas antes do início do evento." }, { status: 403 });
    }

    // Realiza a alteração
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        participantName,
        participantCpf,
        isParticipantEdited: true,
      },
    });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error("[PATCH /api/tickets/participant]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
