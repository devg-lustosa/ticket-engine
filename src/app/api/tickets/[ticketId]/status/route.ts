import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Busca o ticket associado ao usuário logado
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        user: { authId: user.id },
      },
      select: {
        status: true,
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ status: ticket.status });
  } catch (error) {
    console.error("[ticket/status/route] Error:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar status." },
      { status: 500 }
    );
  }
}
