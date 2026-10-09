import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findFirst({
    where: { id: "2610c39c-a053-4875-a668-8a31b4dfbe74" },
    include: { organizer: true }
  });

  if (event) {
    console.log("Event owner:", event.organizerId);
    console.log("Is owner equal to dbUserId?", event.organizerId === "7797fd02-be33-4196-a5e7-89255e5f3acf");
  } else {
    console.log("Event not found at all!");
  }
}

main().finally(() => prisma.$disconnect());
