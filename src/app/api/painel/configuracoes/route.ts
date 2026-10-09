import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });

    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
    }

    const { asaasWalletId } = await request.json();

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        asaasWalletId: asaasWalletId ? asaasWalletId.trim() : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[config/route] PUT error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
