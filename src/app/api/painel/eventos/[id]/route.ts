import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
export async function PUT(
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

    if (!title || !slug || !date || !venue) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    const existingSlug = await prisma.event.findFirst({
      where: { slug, id: { not: id } },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: `O slug "${slug}" já está em uso.` },
        { status: 409 }
      );
    }

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const evt = await tx.event.update({
        where: { id },
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
        },
      });

      // Logica de atualização de lotes:
      // Busca lotes existentes
      const existingBatches = await tx.batch.findMany({ where: { eventId: id } });
      
      const payloadBatches = batches || [];
      const incomingNames = payloadBatches.map((b: any) => b.name.trim());

      // Atualiza ou Cria
      for (let i = 0; i < payloadBatches.length; i++) {
        const b = payloadBatches[i];
        const existing = existingBatches.find(eb => eb.name.toLowerCase() === b.name.trim().toLowerCase());
        
        if (existing) {
          await tx.batch.update({
            where: { id: existing.id },
            data: {
              price: b.price,
              totalQty: b.totalQty,
              endAt: b.endAt ? new Date(b.endAt) : null,
              startAt: b.startAt ? new Date(b.startAt) : null,
              sortOrder: b.sortOrder ?? i,
            }
          });
        } else {
          await tx.batch.create({
            data: {
              eventId: id,
              name: b.name.trim(),
              price: b.price,
              totalQty: b.totalQty,
              soldQty: 0,
              startAt: b.startAt ? new Date(b.startAt) : null,
              endAt: b.endAt ? new Date(b.endAt) : null,
              sortOrder: b.sortOrder ?? i,
            }
          });
        }
      }

      // Deleta lotes que não estão no payload e que tenham 0 ingressos vendidos (para evitar erros de FK cascade)
      for (const eb of existingBatches) {
        if (!incomingNames.some((name: string) => name.toLowerCase() === eb.name.toLowerCase())) {
          if (eb.soldQty > 0) {
            throw new Error(`O lote "${eb.name}" já possui ${eb.soldQty} ingresso(s) vendido(s) e não pode ser excluído. Para parar de vendê-lo, altere a data de término (Fim) para uma data no passado.`);
          }
          await tx.batch.delete({ where: { id: eb.id } });
        }
      }

      return evt;
    });

    revalidatePath("/", "layout");
    revalidatePath(`/evento/${updatedEvent.slug}`, "page");

    return NextResponse.json({ event: updatedEvent });
  } catch (err) {
    console.error("[PUT /api/painel/eventos/[id]]", err);
    const msg = err instanceof Error ? err.message : "Erro interno do servidor";
    return NextResponse.json(
      { error: msg },
      { status: 400 }
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
