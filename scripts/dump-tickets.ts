import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.ticket.findMany({ select: { id: true, qrHash: true, status: true } })
  .then(console.log)
  .finally(() => p.$disconnect())
