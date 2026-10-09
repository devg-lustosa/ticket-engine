import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const eventId = "2610c39c-a053-4875-a668-8a31b4dfbe74"; // The one we found
  
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: {
      batches: {
        include: {
          tickets: {
            include: { payment: true },
          },
        },
      },
    },
  });

  if (!event) throw new Error("Event not found");

  let grossRevenue = 0;
  let cortesias = 0;
  let totalPaidTickets = 0;
  let totalCheckins = 0;

  const batchesReport = event.batches.map(batch => {
    let batchRevenue = 0;
    let batchPaidCount = 0;
    let batchCortesiaCount = 0;
    let batchCheckins = 0;

    batch.tickets.forEach(ticket => {
      if (ticket.status !== "PENDING" && ticket.status !== "CANCELLED") {
        if (ticket.status === "USED") {
          totalCheckins++;
          batchCheckins++;
        }

        if (ticket.payment?.method === "FREE") {
          cortesias++;
          batchCortesiaCount++;
        } else if (ticket.payment) {
          const amount = Number(ticket.payment.amount);
          grossRevenue += amount;
          batchRevenue += amount;
          totalPaidTickets++;
          batchPaidCount++;
        }
      }
    });

    return {
      id: batch.id,
      name: batch.name,
      price: Number(batch.price),
      paidCount: batchPaidCount,
      cortesiaCount: batchCortesiaCount,
      revenue: batchRevenue,
      checkins: batchCheckins,
    };
  });

  console.log("Success!", { grossRevenue, cortesias });
}

main().finally(() => prisma.$disconnect());
