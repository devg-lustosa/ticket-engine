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

    const { nickname } = await request.json();

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json({ error: "Nickname inválido" }, { status: 400 });
    }

    // Validate regex (letters, numbers, underscores)
    const isValid = /^[a-zA-Z0-9_]+$/.test(nickname);
    if (!isValid) {
      return NextResponse.json({ error: "O nickname deve conter apenas letras, números e underlines (_)" }, { status: 400 });
    }

    // Convert to lowercase
    const normalizedNickname = nickname.toLowerCase();

    // Check availability
    const existingUser = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: normalizedNickname,
          mode: "insensitive"
        }
      },
    });

    if (existingUser && existingUser.authId !== user.id) {
      return NextResponse.json({ error: "Esse nickname já está em uso" }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { authId: user.id },
      data: { nickname: normalizedNickname },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("[api/user/nickname]", error);
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}
