import { Resend } from "resend";
import TicketEmail from "@/emails/TicketEmail";
import { render } from "@react-email/render";

// Usa um valor genérico durante o build do Vercel caso a variável não exista
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

export async function sendTicketEmail(
  to: string,
  ticketData: {
    participantName: string;
    eventName: string;
    eventDate: string;
    venue: string;
    qrHash: string;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY não configurada. E-mail não será enviado.");
    return;
  }

  try {
    const htmlContent = await render(TicketEmail(ticketData) as React.ReactElement);

    const { data, error } = await resend.emails.send({
      from: "Ticket Engine <onboarding@resend.dev>", // Usar o email de testes do resend para desenvolvimento
      to: [to],
      subject: `Seu ingresso para ${ticketData.eventName}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[EmailService] Erro ao enviar e-mail:", error);
    } else {
      console.log("[EmailService] E-mail enviado com sucesso:", data);
    }
  } catch (error) {
    console.error("[EmailService] Exceção ao enviar e-mail:", error);
  }
}
