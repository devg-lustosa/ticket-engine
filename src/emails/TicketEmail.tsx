import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Img,
  Section,
} from "@react-email/components";
import * as React from "react";

interface TicketEmailProps {
  participantName: string;
  eventName: string;
  eventDate: string;
  venue: string;
  qrHash: string;
}

export const TicketEmail = ({
  participantName,
  eventName,
  eventDate,
  venue,
  qrHash,
}: TicketEmailProps) => {
  // Utilizamos a API pública do QR Server para renderizar o QR Code no e-mail
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrHash}`;

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f9fc", padding: "20px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e6ebf1", borderRadius: "8px", padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
          <Heading style={{ color: "#333", fontSize: "24px", textAlign: "center", marginBottom: "20px" }}>
            Seu ingresso está garantido! 🎉
          </Heading>
          
          <Text style={{ fontSize: "16px", color: "#555" }}>
            Olá, <strong>{participantName}</strong>,
          </Text>
          <Text style={{ fontSize: "16px", color: "#555" }}>
            Seu pagamento foi aprovado e seu ingresso para o evento <strong>{eventName}</strong> já está disponível.
          </Text>

          <Section style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", margin: "20px 0", textAlign: "center" }}>
            <Text style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 10px 0" }}>{eventName}</Text>
            <Text style={{ margin: "5px 0", color: "#666" }}>📅 {eventDate}</Text>
            <Text style={{ margin: "5px 0", color: "#666" }}>📍 {venue}</Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "30px 0" }}>
            <Text style={{ fontSize: "14px", color: "#888", marginBottom: "10px" }}>Apresente o QR Code abaixo na portaria do evento:</Text>
            <Img src={qrCodeUrl} width="250" height="250" alt="QR Code do Ingresso" style={{ margin: "0 auto", border: "4px solid #fff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Text style={{ fontSize: "12px", color: "#aaa", marginTop: "10px" }}>Código: {qrHash}</Text>
          </Section>

          <Text style={{ fontSize: "14px", color: "#888", textAlign: "center", marginTop: "40px" }}>
            Obrigado por comprar conosco!<br />
            Equipe Ticket Engine
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketEmail;
