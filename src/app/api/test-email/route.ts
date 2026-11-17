import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, requireActor } from "@/lib/api";
import { sendTicketEmail } from "@/services/email.service";

export async function GET(_request?: Request) {
  return new NextResponse(null, { status: 404 });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  try {
    assertSameOrigin(request);
    const actor = await requireActor(["ORGANIZER"]);
    await sendTicketEmail(actor.email, { participantName: actor.name, eventName: "Teste local de envio", eventDate: "Sem validade para entrada", venue: "Desenvolvimento", qrHash: "TESTE-SEM-VALIDADE" });
    return NextResponse.json({ message: "Teste solicitado para o e-mail da sua conta. Confira o provedor de envio." });
  } catch (error) { return apiError(error); }
}
