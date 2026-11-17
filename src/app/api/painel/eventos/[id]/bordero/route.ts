import { NextResponse } from "next/server";
import { apiError, requireActor, uuid, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emptySales, salesForEvents } from "@/services/sales.service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(["ORGANIZER"]);
    const id = uuid((await params).id, "Evento");
    const event = await prisma.event.findFirst({ where: { id, organizerId: actor.id }, select: {
      id: true, title: true, date: true, batches: { select: { id: true, name: true, price: true }, orderBy: { sortOrder: "asc" } },
    } });
    if (!event) throw new ApiError(404, "Evento não encontrado.");
    const sales = await salesForEvents([id]);
    return NextResponse.json({ eventName: event.title, eventDate: event.date,
      batches: event.batches.map(batch => ({ id: batch.id, name: batch.name, price: Number(batch.price),
        ...(sales.batches.get(batch.id) ?? { paidCount: 0, cortesiaCount: 0, revenue: 0, refundedAmount: 0, checkins: 0 }) })),
      summary: sales.events.get(id) ?? emptySales(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
