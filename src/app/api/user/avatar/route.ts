import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "Nenhuma imagem enviada" }, { status: 400 });
    }

    // Extrair o conteúdo base64
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Limite de 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem não pode ter mais que 5MB" }, { status: 400 });
    }

    const fileName = `${user.id}-${Date.now()}.${contentType.split('/')[1]}`;

    // Cliente Admin para ignorar bloqueio de RLS do Supabase
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload para o Supabase Storage (requer o bucket "avatars" criado)
    const { error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      return NextResponse.json({ error: "Erro ao fazer upload no Supabase. Detalhes: " + error.message }, { status: 500 });
    }

    // Pegar URL Pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Salvar no Banco
    await prisma.user.update({
      where: { authId: user.id },
      data: { avatarUrl: publicUrl }
    });

    return NextResponse.json({ success: true, avatarUrl: publicUrl });
  } catch (error: any) {
    console.error("[api/user/avatar]", error);
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}
