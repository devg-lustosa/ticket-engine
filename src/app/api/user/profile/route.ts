import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, cpf, phone, birthDate, nickname } = await request.json();

    if (name !== undefined && (!name || name.trim().length < 2)) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }

    let parsedDate = null;
    if (birthDate) {
      parsedDate = new Date(birthDate);
      if (isNaN(parsedDate.getTime())) {
         return NextResponse.json({ error: "Data inválida" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { authId: user.id },
      data: {
        name: name || undefined,
        cpf: cpf || undefined,
        phone: phone || null,
        birthDate: parsedDate,
        nickname: nickname || undefined,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("[api/user/profile]", error);
    // Tratar violação de unique constraint do CPF
    if (error.code === 'P2002' && error.meta?.target?.includes('cpf')) {
      return NextResponse.json({ error: "Este CPF já está em uso por outra conta." }, { status: 409 });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('nickname')) {
      return NextResponse.json({ error: "Este nickname já está em uso. Escolha outro." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
