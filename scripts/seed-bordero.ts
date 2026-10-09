import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando banco de dados...");
  await prisma.ticket.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.event.deleteMany({});

  console.log("Buscando um organizador...");
  const organizer = await prisma.user.findFirst({
    where: { role: "ORGANIZER" },
  });

  if (!organizer) {
    throw new Error("Nenhum usuário ORGANIZER encontrado. Por favor, faça login pelo menos uma vez com sua conta de organizador.");
  }

  console.log("Criando evento...");
  const event = await prisma.event.create({
    data: {
      title: "Neon Party Experience",
      slug: "neon-party-2026",
      description: "A maior festa neon da região! Traga seus amigos para uma noite inesquecível com muita luz, música eletrônica, DJs convidados e open bar de cores.",
      venue: "Espaço das Artes",
      address: "Av. Central, 1000",
      city: "São Paulo",
      state: "SP",
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // daqui 30 dias
      doorsOpen: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 - 1000 * 60 * 60 * 2), // 2h antes
      status: "PUBLISHED",
      organizerId: organizer.id,
      coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop", // Foto genérica bonita de festa
    },
  });

  console.log("Criando lotes...");
  const batch1 = await prisma.batch.create({
    data: {
      eventId: event.id,
      name: "1º Lote",
      price: 50.00,
      totalQty: 200,
      soldQty: 20,
    }
  });

  const batch2 = await prisma.batch.create({
    data: {
      eventId: event.id,
      name: "2º Lote - VIP",
      price: 150.00,
      totalQty: 100,
      soldQty: 20,
    }
  });

  console.log("Gerando 50 ingressos...");
  // Vamos criar 50 pagamentos e 50 tickets
  
  // 20 ingressos lote 1
  for (let i = 0; i < 20; i++) {
    const isUsed = i < 15; // 15 fizeram check-in, 5 no-show
    const payment = await prisma.payment.create({
      data: {
        gatewayId: "sim_p_" + uuidv4().slice(0, 8),
        method: "CREDIT_CARD",
        status: "PAID",
        amount: 50.00,
        paidAt: new Date(),
      }
    });
    await prisma.ticket.create({
      data: {
        batchId: batch1.id,
        userId: organizer.id,
        paymentId: payment.id,
        participantName: `Comprador Lote 1 #${i+1}`,
        participantCpf: "11122233344",
        status: isUsed ? "USED" : "ACTIVE",
        usedAt: isUsed ? new Date() : null,
        qrHash: "qr_" + uuidv4(),
      }
    });
  }

  // 20 ingressos lote 2
  for (let i = 0; i < 20; i++) {
    const isUsed = i < 18; // 18 fizeram check-in, 2 no-show
    const payment = await prisma.payment.create({
      data: {
        gatewayId: "sim_p_" + uuidv4().slice(0, 8),
        method: "PIX",
        status: "PAID",
        amount: 150.00,
        paidAt: new Date(),
      }
    });
    await prisma.ticket.create({
      data: {
        batchId: batch2.id,
        userId: organizer.id,
        paymentId: payment.id,
        participantName: `Comprador VIP #${i+1}`,
        participantCpf: "99988877766",
        status: isUsed ? "USED" : "ACTIVE",
        usedAt: isUsed ? new Date() : null,
        qrHash: "qr_" + uuidv4(),
      }
    });
  }

  // 10 Cortesias (Lote 1)
  await prisma.batch.update({ where: { id: batch1.id }, data: { soldQty: { increment: 10 } } });
  
  for (let i = 0; i < 10; i++) {
    const isUsed = i < 9; // 9 fizeram check-in
    const payment = await prisma.payment.create({
      data: {
        gatewayId: "FREE_" + uuidv4().slice(0, 8),
        method: "FREE",
        status: "PAID",
        amount: 0,
        paidAt: new Date(),
      }
    });
    await prisma.ticket.create({
      data: {
        batchId: batch1.id,
        userId: organizer.id,
        paymentId: payment.id,
        participantName: `Convidado Cortesia #${i+1}`,
        participantCpf: "",
        status: isUsed ? "USED" : "ACTIVE",
        usedAt: isUsed ? new Date() : null,
        qrHash: "qr_free_" + uuidv4(),
      }
    });
  }

  console.log("Setup finalizado! 50 Ingressos gerados no banco de dados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
