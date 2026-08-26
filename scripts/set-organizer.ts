import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.user.updateMany({ data: { role: 'ORGANIZER' } })
  .then(console.log)
  .finally(() => prisma.$disconnect())
