import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.updateMany({
    data: { organizerId: "7797fd02-be33-4196-a5e7-89255e5f3acf" }
  });
  console.log("Transferred event to your user!");
}

main().finally(() => prisma.$disconnect());
