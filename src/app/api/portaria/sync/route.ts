import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
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

    // Busca ingressos ATIVOS ou USADOS
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { in: ["ACTIVE", "USED"] },
        ...(dbUser.role === "ORGANIZER"
          ? { batch: { event: { organizerId: dbUser.id } } }
          : {}),
      },
      select: {
        id: true,
        qrHash: true,
        status: true,
        participantName: true,
        participantCpf: true,
        usedAt: true,
        batch: {
          select: {
            name: true,
            event: { select: { title: true } },
          },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        participantName: 'asc'
      }
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("[api/portaria/sync] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
