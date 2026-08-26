import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.batch.findFirst().then(b => console.log(b?.id)).finally(() => prisma.$disconnect())
