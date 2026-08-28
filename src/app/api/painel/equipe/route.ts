import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email || !role || (role !== "STAFF" && role !== "ORGANIZER")) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado. Peça para ele criar uma conta na plataforma primeiro." }, { status: 404 });
    }

    if (targetUser.role === role) {
      return NextResponse.json({ error: "O usuário já possui este cargo." }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { role: role as any }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao adicionar equipe:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "ID do usuário não fornecido" }, { status: 400 });
    }

    if (targetUserId === dbUser.id) {
      return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "BUYER" }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao remover equipe:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
