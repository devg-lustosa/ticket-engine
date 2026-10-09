import { NextRequest, NextResponse } from "next/server";
import { sendTicketEmail } from "@/services/email.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Forneça o email destino via ?to=seu@email.com" }, { status: 400 });
  }

  try {
    await sendTicketEmail(to, {
      participantName: "Comprador VIP de Teste",
      eventName: "Festa de Teste 2026",
      eventDate: "12 de Outubro de 2026 às 20:00",
      venue: "Local de Teste, Centro",
      qrHash: "AB12CD34-TESTE",
    });
    
    return NextResponse.json({ success: true, message: `E-mail disparado para ${to}. Verifique a sua caixa de entrada e os logs do terminal!` });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
