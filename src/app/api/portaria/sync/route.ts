import { NextResponse } from "next/server";
import { apiError, requireActor, uuid } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { gateEvent } from "@/services/gate.service";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(["STAFF", "ORGANIZER"]);
    const params = new URL(request.url).searchParams;
    const eventId = uuid(params.get("eventId"), "Evento");
    const cursor = params.get("cursor");
    if (cursor) uuid(cursor, "Cursor");
    const event = await gateEvent(actor, eventId);
    const tickets = await prisma.ticket.findMany({
      where: { batch: { eventId }, status: { in: ["ACTIVE", "USED"] }, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: { id: true, qrHash: true, status: true, participantName: true, participantCpf: true, usedAt: true,
        batch: { select: { name: true, event: { select: { id: true, title: true } } } }, user: { select: { name: true } } },
      orderBy: { id: "asc" }, take: 1001,
    });
    const hasMore = tickets.length > 1000;
    const page = tickets.slice(0, 1000);
    return NextResponse.json({ success: true, actorId: actor.id, event, tickets: page, nextCursor: hasMore ? page[page.length - 1].id : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
