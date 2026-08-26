import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.event.updateMany({ data: { title: 'Projeto X', slug: 'projeto-x' } })
  .then(console.log)
  .finally(() => p.$disconnect())
