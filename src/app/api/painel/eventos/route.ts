import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────
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

    // ── Body ──────────────────────────────────────────────
    const body = await request.json();
    const {
      title,
      slug,
      date,
      doorsOpen,
      venue,
      address,
      city,
      state,
      coverImage,
      description,
      batches = [],
    } = body;

    // ── Validate ──────────────────────────────────────────
    if (!title || !slug || !date || !venue) {
      return NextResponse.json(
        { error: "Campos obrigatórios: title, slug, date, venue" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `O slug "${slug}" já está em uso. Altere o nome do evento.` },
        { status: 409 }
      );
    }

    // ── Create Event + Batches in a transaction ────────────
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: title.trim(),
          slug: slug.trim(),
          date: new Date(date),
          doorsOpen: doorsOpen ? new Date(doorsOpen) : null,
          venue: venue.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          coverImage: coverImage || null,
          description: description?.trim() || null,
          status: "DRAFT",
          organizerId: dbUser.id,
        },
      });

      // Create batches
      if (batches.length > 0) {
        await tx.batch.createMany({
          data: batches
            .filter(
              (b: { name?: string; price?: number; totalQty?: number }) =>
                !!b.name && b.price !== undefined && b.price >= 0 && !!b.totalQty && b.totalQty > 0
            )
            .map(
              (b: {
                name: string;
                price: number;
                totalQty: number;
                endAt?: string | null;
                sortOrder?: number;
              }) => ({
                eventId: newEvent.id,
                name: b.name.trim(),
                price: b.price,
                totalQty: b.totalQty,
                soldQty: 0,
                endAt: b.endAt ? new Date(b.endAt) : null,
                sortOrder: b.sortOrder ?? 0,
              })
            ),
        });
      }

      return newEvent;
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/painel/eventos]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
