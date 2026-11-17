import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { apiError, assertSameOrigin, jsonBody, requireActor, uuid } from "@/lib/api";
import { checkout, checkoutInput } from "@/services/checkout.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor();
    const key = uuid(request.headers.get("idempotency-key"), "Chave do pedido");
    const input = checkoutInput(await jsonBody(request));
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    const result = await checkout(actor, input, key, forwarded && isIP(forwarded) ? forwarded : null);
    return NextResponse.json(result, { status: result.pending ? 202 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
