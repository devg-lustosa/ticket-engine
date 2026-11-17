import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, requireActor, uuid } from "@/lib/api";
import { requestTicketRefund } from "@/services/refund.service";

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor();
    const ticketId = uuid((await params).ticketId, "Ingresso");
    const result = await requestTicketRefund(actor, ticketId);
    return NextResponse.json(result, { status: result.pending ? 202 : 200 });
  } catch (error) { return apiError(error); }
}
