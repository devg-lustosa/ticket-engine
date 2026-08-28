import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ["DRAFT", "PUBLISHED", "CANCELLED", "FINISHED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ event });
  } catch (err) {
    console.error("[PATCH /api/painel/eventos/[id]]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/painel/eventos/[id]]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
