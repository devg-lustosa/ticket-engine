import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.event.updateMany({ 
  where: { slug: 'projeto-x' },
  data: { coverImage: '/capa.png' } 
})
  .then(console.log)
  .finally(() => p.$disconnect())
