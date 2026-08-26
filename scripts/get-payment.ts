import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.payment.findFirst({ orderBy: { createdAt: 'desc' } })
  .then(p => console.log(p?.gatewayId))
  .finally(() => prisma.$disconnect())
