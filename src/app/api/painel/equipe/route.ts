import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin, jsonBody, uuid } from "@/lib/api";
import { changeTeamRole } from "@/services/team.service";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { email: rawEmail, role } = await jsonBody(request);
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || email.length > 254 || (role !== "STAFF" && role !== "ORGANIZER")) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado. Peça para ele criar uma conta na plataforma primeiro." }, { status: 404 });
    }

    if (targetUser.role === role) {
      return NextResponse.json({ error: "O usuário já possui este cargo." }, { status: 400 });
    }

    await changeTeamRole(dbUser.id, targetUser.id, role);

    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
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
    const targetUserId = uuid(searchParams.get("userId"), "Usuário");

    if (targetUserId === dbUser.id) {
      return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
    }

    await changeTeamRole(dbUser.id, targetUserId, "BUYER");

    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
