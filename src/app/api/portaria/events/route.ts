import { NextResponse } from "next/server";
import { apiError, requireActor } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const actor = await requireActor(["STAFF", "ORGANIZER"]);
    const events = await prisma.event.findMany({ where: {
      status: "PUBLISHED", ...(actor.role === "ORGANIZER" ? { organizerId: actor.id } : {}),
    }, select: { id: true, title: true, date: true }, orderBy: { date: "asc" }, take: 200 });
    return NextResponse.json({ events, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
