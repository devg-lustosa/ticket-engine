import { NextResponse } from "next/server";
import { apiError, requireActor } from "@/lib/api";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  try {
    await requireActor(["ORGANIZER"]);
    return NextResponse.json({ hasAsaasKey: Boolean(process.env.ASAAS_API_KEY), hasWebhookKey: Boolean(process.env.ASAAS_WEBHOOK_SECRET) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
