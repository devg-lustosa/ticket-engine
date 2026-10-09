import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findFirst({ where: { slug: "neon-party-2026" } });
  if (!event) {
    console.log("Evento não encontrado.");
    return;
  }
  console.log("Event ID:", event.id);
}

main().finally(() => prisma.$disconnect());
