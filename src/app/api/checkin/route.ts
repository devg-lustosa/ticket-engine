import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || (dbUser.role !== "STAFF" && dbUser.role !== "ORGANIZER")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { qrHash } = body as { qrHash?: string };

    if (!qrHash || !qrHash.trim()) {
      return NextResponse.json({ error: "qrHash obrigatório." }, { status: 400 });
    }

    const cleanHash = qrHash.trim();
    console.log("Recebido na API checkin, cleanHash:", `"${cleanHash}"`);

    // 3. Busca o ingresso
    const ticket = await prisma.ticket.findUnique({
      where: { qrHash: cleanHash },
      include: {
        user: { select: { name: true, email: true, cpf: true } },
        batch: {
          include: {
            event: { select: { title: true, date: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ingresso não encontrado ou inválido." },
        { status: 404 }
      );
    }

    // 4. Regras de negócio
    if (ticket.status === "USED") {
      return NextResponse.json(
        {
          success: false,
          error: "Ingresso já utilizado",
          usedAt: ticket.usedAt,
          buyer: ticket.user.name,
        },
        { status: 409 }
      );
    }

    if (ticket.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Ingresso cancelado." },
        { status: 409 }
      );
    }

    if (ticket.status === "PENDING") {
      return NextResponse.json(
        { success: false, error: "Pagamento não confirmado." },
        { status: 409 }
      );
    }

    // 5. Efetua o check-in (ACTIVE -> USED)
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        usedAt: new Date(),
        checkedBy: dbUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        buyerName: ticket.user.name,
        batchName: ticket.batch.name,
        eventName: ticket.batch.event.title,
        usedAt: updatedTicket.usedAt,
      },
    });
  } catch (error) {
    console.error("[api/checkin] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
