import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.event.updateMany({
    data: {
      address: "Av. Weyne Cavalcante, nº 1222, Vale do Sossego",
      city: "Canaã dos Carajás",
      state: "PA"
    }
  })
  console.log("Endereço atualizado no banco!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
