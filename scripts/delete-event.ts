import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  try {
    // 1. Find the event
    const event = await p.event.findUnique({
      where: { slug: 'projeto-x' },
      include: { batches: { include: { tickets: true } } },
    })
    if (!event) { console.log('Evento não encontrado'); return }

    // 2. Delete payments → tickets → batches → event
    for (const batch of event.batches) {
      const ticketIds = batch.tickets.map(t => t.id)
      await p.payment.deleteMany({ where: { tickets: { some: { id: { in: ticketIds } } } } })
      await p.ticket.deleteMany({ where: { batchId: batch.id } })
    }
    await p.batch.deleteMany({ where: { eventId: event.id } })
    await p.event.delete({ where: { id: event.id } })
    console.log('Deletado:', event.title)
  } catch (err: unknown) {
    if (err instanceof Error) console.error('Erro:', err.message)
    else console.error(err)
  } finally {
    await p.$disconnect()
  }
}

main()
