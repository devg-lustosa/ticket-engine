import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
p.ticket.count().then(c => console.log('Total tickets:', c)).finally(() => p.$disconnect())
