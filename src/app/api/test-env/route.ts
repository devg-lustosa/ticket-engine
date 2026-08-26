import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAsaasKey: !!process.env.ASAAS_API_KEY,
    asaasKeyLength: process.env.ASAAS_API_KEY?.length || 0,
    hasWebhookKey: !!process.env.ASAAS_WEBHOOK_SECRET,
  });
}
