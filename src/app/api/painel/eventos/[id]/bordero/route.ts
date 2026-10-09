import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || dbUser.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: dbUser.id },
      include: {
        batches: {
          include: {
            tickets: {
              include: { payment: true },
            },
          },
        },
      },
    });

    if (!event) return NextResponse.json({ error: `Evento não encontrado. eventId=${eventId}, dbUserId=${dbUser.id}` }, { status: 404 });

    // Calculando relatórios
    let grossRevenue = 0;
    let cortesias = 0;
    let totalPaidTickets = 0;
    let totalCheckins = 0;

    const batchesReport = event.batches.map(batch => {
      let batchRevenue = 0;
      let batchPaidCount = 0;
      let batchCortesiaCount = 0;
      let batchCheckins = 0;

      batch.tickets.forEach(ticket => {
        if (ticket.status !== "PENDING" && ticket.status !== "CANCELLED") {
          if (ticket.status === "USED") {
            totalCheckins++;
            batchCheckins++;
          }

          if (ticket.payment?.method === "FREE") {
            cortesias++;
            batchCortesiaCount++;
          } else if (ticket.payment) {
            const amount = Number(ticket.payment.amount);
            grossRevenue += amount;
            batchRevenue += amount;
            totalPaidTickets++;
            batchPaidCount++;
          }
        }
      });

      return {
        id: batch.id,
        name: batch.name,
        price: Number(batch.price),
        paidCount: batchPaidCount,
        cortesiaCount: batchCortesiaCount,
        revenue: batchRevenue,
        checkins: batchCheckins,
      };
    });

    const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%
    const platformFee = grossRevenue * PLATFORM_FEE_PERCENTAGE;
    const netRevenue = grossRevenue - platformFee;

    const totalTicketsValid = totalPaidTickets + cortesias;
    const noShowCount = totalTicketsValid - totalCheckins;
    const noShowRate = totalTicketsValid > 0 ? (noShowCount / totalTicketsValid) * 100 : 0;

    return NextResponse.json({
      eventName: event.title,
      eventDate: event.date,
      batches: batchesReport,
      summary: {
        grossRevenue,
        platformFee,
        netRevenue,
        cortesias,
        totalPaidTickets,
        totalCheckins,
        totalTicketsValid,
        noShowCount,
        noShowRate,
      }
    });

  } catch (error: any) {
    console.error("[api/bordero] Erro:", error);
    return NextResponse.json({ error: error?.message || "Erro interno no servidor." }, { status: 500 });
  }
}
