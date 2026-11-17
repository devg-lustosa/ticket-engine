import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, jsonBody, requireActor, uuid, ApiError } from "@/lib/api";
import { performCheckin } from "@/services/gate.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor(["STAFF", "ORGANIZER"]);
    const body = await jsonBody(request);
    if (body.actorId !== undefined && body.actorId !== actor.id) throw new ApiError(409, "A sessão mudou. Recarregue a portaria.", "SESSION_CHANGED");
    const eventId = uuid(body.eventId, "Evento");
    if (typeof body.qrHash !== "string" || !body.qrHash.trim() || body.qrHash.length > 256) throw new ApiError(400, "QR ou código obrigatório.");
    const ticket = await performCheckin(actor, eventId, body.qrHash.trim());
    return NextResponse.json({ success: true, ticket });
  } catch (error) { return apiError(error); }
}
