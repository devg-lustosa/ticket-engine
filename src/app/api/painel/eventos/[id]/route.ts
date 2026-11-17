import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma, type EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, assertSameOrigin, jsonBody, requireActor, uuid } from "@/lib/api";
import { fromCents, toCents } from "@/lib/money";

type Context = { params: Promise<{ id: string }> };

async function ownedEvent(request: Request, context: Context) {
  assertSameOrigin(request);
  const actor = await requireActor(["ORGANIZER"]);
  const id = uuid((await context.params).id);
  const event = await prisma.event.findFirst({ where: { id, organizerId: actor.id } });
  if (!event) throw new ApiError(404, "Evento não encontrado.");
  return event;
}

function refresh(slug: string) {
  revalidateTag("events", { expire: 0 });
  revalidateTag("event-details", { expire: 0 });
  revalidatePath("/painel");
  revalidatePath("/evento/" + slug);
}

function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return apiError(new ApiError(409, "Este endereço de evento já está em uso."));
    if (error.code === "P2003") return apiError(new ApiError(409, "Este evento possui registros vinculados. Cancele o evento para preservar o histórico."));
    if (error.code === "P2025") return apiError(new ApiError(404, "Evento não encontrado."));
  }
  return apiError(error);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const event = await ownedEvent(request, context);
    const { status } = await jsonBody(request);
    if (typeof status !== "string" || !["DRAFT", "PUBLISHED", "CANCELLED", "FINISHED"].includes(status)) throw new ApiError(400, "Status inválido.");
    const updated = await prisma.event.update({ where: { id: event.id, organizerId: event.organizerId }, data: { status: status as EventStatus } });
    refresh(updated.slug);
    return NextResponse.json({ event: updated });
  } catch (error) { return failure(error); }
}

function text(value: unknown, required = false): string | null {
  if (value == null || value === "") { if (required) throw new ApiError(400, "Campos obrigatórios ausentes."); return null; }
  if (typeof value !== "string" || value.length > 10000 || (required && !value.trim())) throw new ApiError(400, "Texto inválido.");
  return value.trim();
}

function date(value: unknown, required = false): Date | null {
  const raw = text(value, required);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) throw new ApiError(400, "Data inválida.");
  return parsed;
}

export async function PUT(request: Request, context: Context) {
  try {
    const event = await ownedEvent(request, context);
    // O editor existente envia a capa em base64; as demais APIs usam o limite menor.
    const body = await jsonBody(request, 8 * 1024 * 1024);
    if (!Array.isArray(body.batches) || body.batches.length > 100) throw new ApiError(400, "Lotes inválidos.");
    const batches = body.batches.map((raw: unknown, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ApiError(400, "Lote inválido.");
      const batch = raw as Record<string, unknown>;
      let cents: number;
      try { cents = toCents(String(batch.price)); } catch { throw new ApiError(400, "Preço inválido."); }
      if (cents > 9999999999 || !Number.isInteger(batch.totalQty) || Number(batch.totalQty) < 1 || Number(batch.totalQty) > 10000000) throw new ApiError(400, "Capacidade ou preço inválido.");
      const startAt = date(batch.startAt), endAt = date(batch.endAt);
      if (startAt && endAt && startAt >= endAt) throw new ApiError(400, "O início das vendas deve anteceder o término.");
      return { name: text(batch.name, true)!, price: fromCents(cents), totalQty: Number(batch.totalQty), startAt, endAt, sortOrder: index };
    });
    if (new Set(batches.map(batch => batch.name.toLowerCase())).size !== batches.length) throw new ApiError(400, "Nomes de lotes repetidos.");
    if (body.coverImage != null && typeof body.coverImage !== "string") throw new ApiError(400, "Capa inválida.");
    const data = { title: text(body.title, true)!, slug: text(body.slug, true)!, date: date(body.date, true)!, doorsOpen: date(body.doorsOpen),
      venue: text(body.venue, true)!, address: text(body.address), city: text(body.city), state: text(body.state), description: text(body.description), coverImage: (body.coverImage as string) || null };
    const updated = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM batches WHERE event_id = ${event.id} ORDER BY id FOR UPDATE`;
      const existing = await tx.batch.findMany({ where: { eventId: event.id }, include: { _count: { select: { tickets: true } } } });
      const result = await tx.event.update({ where: { id: event.id, organizerId: event.organizerId }, data });
      for (const batch of batches) {
        const previous = existing.find(item => item.name.toLowerCase() === batch.name.toLowerCase());
        if (previous && batch.totalQty < previous.soldQty) throw new ApiError(409, "A capacidade não pode ser menor que os ingressos já reservados ou vendidos.");
        if (previous) await tx.batch.update({ where: { id: previous.id }, data: batch });
        else await tx.batch.create({ data: { ...batch, eventId: event.id } });
      }
      for (const previous of existing.filter(item => !batches.some(batch => batch.name.toLowerCase() === item.name.toLowerCase()))) {
        if (previous.soldQty > 0 || previous._count.tickets > 0) throw new ApiError(409, "Um lote com ingressos não pode ser removido ou renomeado. Encerre suas vendas pela data de término.");
        await tx.batch.delete({ where: { id: previous.id } });
      }
      return result;
    });
    refresh(event.slug); if (event.slug !== updated.slug) refresh(updated.slug);
    return NextResponse.json({ event: updated });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const event = await ownedEvent(request, context);
    await prisma.event.delete({ where: { id: event.id, organizerId: event.organizerId } });
    refresh(event.slug);
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
