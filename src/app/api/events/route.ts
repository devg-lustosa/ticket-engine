import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, date, venue, address, city, state, batches } = body as {
      title: string;
      description?: string;
      date: string;
      venue: string;
      address?: string;
      city?: string;
      state?: string;
      batches: {
        name: string;
        price: number;
        totalQty: number;
        startAt?: string;
        endAt?: string;
      }[];
    };

    if (!title || !date || !venue || !batches || batches.length === 0) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    // Gerar um slug simples baseado no título e na data para garantir exclusividade básica
    let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    if (!baseSlug) baseSlug = "evento";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Criar o evento e os lotes em uma transação
    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description,
        date: new Date(date),
        venue,
        address,
        city,
        state,
        status: "PUBLISHED", // Como é MVP, criaremos como publicado direto
        organizerId: dbUser.id,
        batches: {
          create: batches.map((b, index) => ({
            name: b.name,
            price: b.price,
            totalQty: b.totalQty,
            startAt: b.startAt ? new Date(b.startAt) : null,
            endAt: b.endAt ? new Date(b.endAt) : null,
            sortOrder: index,
          }))
        }
      },
      include: {
        batches: true
      }
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("[events/route] Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar evento." },
      { status: 500 }
    );
  }
}
