import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Seed...')

  // Limpa banco antes
  await prisma.payment.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()

  // 1. Cria Organizador
  const organizer = await prisma.user.create({
    data: {
      authId: 'admin-seed-id', // ID fake
      email: 'admin@ticketengine.com',
      name: 'Admin',
      role: 'ORGANIZER',
    }
  })
  console.log(`✅ Organizador criado: ${organizer.email}`)

  // 2. Cria Evento
  const event = await prisma.event.create({
    data: {
      title: 'Projeto X',
      description: 'A maior experiência eletrônica do ano. Prepare-se para uma noite inesquecível.',
      date: addDays(new Date(), 30),
      venue: 'Club Vibe',
      status: 'PUBLISHED',
      slug: 'projeto-x',
      coverImage: '/capa.png',
      organizerId: organizer.id,
    },
  })

  console.log(`✅ Evento criado: ${event.title}`)

  // 2. Cria Lote (Batch)
  const batch = await prisma.batch.create({
    data: {
      eventId: event.id,
      name: '1º Lote - Pista',
      price: 15.00, // 15 reais para testes Asaas
      totalQty: 100,
      soldQty: 0,
      startAt: new Date(),
      endAt: addDays(new Date(), 29),
    },
  })

  console.log(`✅ Lote criado: ${batch.name} - R$ ${batch.price}`)
  console.log('🌱 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
