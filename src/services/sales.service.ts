import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";

type Row = {
  eventId: string; batchId: string; saleDate: string; gross: Prisma.Decimal; refunded: Prisma.Decimal; pendingRefund: Prisma.Decimal;
  paidCount: bigint; freeCount: bigint; checkins: bigint; legacyCount: bigint; untrackedCancellation: bigint;
};

export function emptySales() {
  return { grossRevenue: 0, refundedAmount: 0, pendingRefundAmount: 0, netSales: 0, platformFee: 0, netRevenue: 0,
    platformFeePercentage: 10, financialEstimate: true, cortesias: 0, totalPaidTickets: 0, totalCheckins: 0,
    totalTicketsValid: 0, noShowCount: 0, noShowRate: 0, legacyPricingTickets: 0, unreconciledCancellations: 0 };
}

function summarize(rows: Row[]) {
  const result = emptySales();
  let grossCents = 0, refundedCents = 0, pendingCents = 0;
  for (const row of rows) {
    grossCents += toCents(row.gross);
    refundedCents += toCents(row.refunded);
    pendingCents += toCents(row.pendingRefund);
    result.totalPaidTickets += Number(row.paidCount);
    result.cortesias += Number(row.freeCount);
    result.totalCheckins += Number(row.checkins);
    result.legacyPricingTickets += Number(row.legacyCount);
    result.unreconciledCancellations += Number(row.untrackedCancellation);
  }
  result.grossRevenue = grossCents / 100;
  result.refundedAmount = refundedCents / 100;
  result.pendingRefundAmount = pendingCents / 100;
  result.netSales = Math.round((result.grossRevenue - result.refundedAmount) * 100) / 100;
  // This is a commercial estimate, not a replacement for the gateway statement.
  result.platformFee = Math.round(result.netSales * result.platformFeePercentage) / 100;
  result.netRevenue = Math.round((result.netSales - result.platformFee) * 100) / 100;
  result.totalTicketsValid = result.totalPaidTickets + result.cortesias;
  result.noShowCount = result.totalTicketsValid - result.totalCheckins;
  result.noShowRate = result.totalTicketsValid ? result.noShowCount / result.totalTicketsValid * 100 : 0;
  return result;
}

export async function salesForEvents(eventIds: string[]) {
  if (!eventIds.length) return { events: new Map<string, ReturnType<typeof emptySales>>(), batches: new Map<string, { paidCount: number; cortesiaCount: number; revenue: number; refundedAmount: number; checkins: number }>(), daily: [] as { date: string; vendas: number }[] };
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    WITH relevant_payments AS (
      SELECT DISTINCT t.payment_id FROM tickets t JOIN batches b ON b.id = t.batch_id
      WHERE b.event_id IN (${Prisma.join(eventIds)}) AND t.payment_id IS NOT NULL
    ), weights AS (
      SELECT t.id, t.batch_id, b.event_id, t.status, t.paid_amount, p.method,
        p.amount * 100 AS order_cents,
        COALESCE(t.unit_price, b.price) AS weight,
        SUM(COALESCE(t.unit_price, b.price)) OVER (PARTITION BY p.id) AS total_weight,
        COUNT(*) OVER (PARTITION BY p.id) AS ticket_count,
        (BOOL_AND(t.paid_amount IS NOT NULL) OVER (PARTITION BY p.id) AND SUM(t.paid_amount) OVER (PARTITION BY p.id) = p.amount) AS has_snapshot,
        p.id AS payment_id, TO_CHAR(COALESCE(p.paid_at, p.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS sale_date,
        CASE WHEN r.status = 'DONE' THEN r.amount ELSE 0 END AS refunded,
        CASE WHEN r.status IN ('STARTED', 'PENDING', 'UNKNOWN') THEN r.amount ELSE 0 END AS pending_refund,
        r.status AS refund_status
      FROM tickets t JOIN batches b ON b.id = t.batch_id JOIN payments p ON p.id = t.payment_id
      LEFT JOIN refunds r ON r.ticket_id = t.id
      WHERE p.id IN (SELECT payment_id FROM relevant_payments) AND p.status IN ('PAID', 'REFUNDED')
    ), amounts AS (
      SELECT *, CASE WHEN has_snapshot THEN paid_amount * 100
        WHEN total_weight > 0 THEN order_cents * weight / total_weight
        ELSE order_cents / ticket_count END AS raw_cents FROM weights
    ), ranked AS (
      SELECT *, FLOOR(raw_cents) AS floor_cents,
        order_cents - SUM(FLOOR(raw_cents)) OVER (PARTITION BY payment_id) AS remaining,
        ROW_NUMBER() OVER (PARTITION BY payment_id ORDER BY raw_cents - FLOOR(raw_cents) DESC, id) AS remainder_rank
      FROM amounts
    )
    SELECT event_id AS "eventId", batch_id AS "batchId", sale_date AS "saleDate",
      SUM(floor_cents + CASE WHEN NOT has_snapshot AND remainder_rank <= remaining THEN 1 ELSE 0 END) / 100 AS gross,
      SUM(refunded) AS refunded, SUM(pending_refund) AS "pendingRefund",
      COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'USED') AND method <> 'FREE') AS "paidCount",
      COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'USED') AND method = 'FREE') AS "freeCount",
      COUNT(*) FILTER (WHERE status = 'USED') AS checkins,
      COUNT(*) FILTER (WHERE NOT has_snapshot AND method <> 'FREE') AS "legacyCount",
      COUNT(*) FILTER (WHERE status = 'CANCELLED' AND refund_status IS NULL AND method <> 'FREE') AS "untrackedCancellation"
    FROM ranked WHERE event_id IN (${Prisma.join(eventIds)}) GROUP BY event_id, batch_id, sale_date
  `);
  const events = new Map(eventIds.map(id => [id, summarize(rows.filter(row => row.eventId === id))]));
  const batches = new Map<string, { paidCount: number; cortesiaCount: number; revenue: number; refundedAmount: number; checkins: number }>();
  const days = new Map<string, number>();
  for (const row of rows) {
    const batch = batches.get(row.batchId) ?? { paidCount: 0, cortesiaCount: 0, revenue: 0, refundedAmount: 0, checkins: 0 };
    batch.paidCount += Number(row.paidCount); batch.cortesiaCount += Number(row.freeCount); batch.checkins += Number(row.checkins);
    batch.revenue = Math.round((batch.revenue + Number(row.gross)) * 100) / 100;
    batch.refundedAmount = Math.round((batch.refundedAmount + Number(row.refunded)) * 100) / 100;
    batches.set(row.batchId, batch);
    days.set(row.saleDate, Math.round(((days.get(row.saleDate) ?? 0) + Number(row.gross)) * 100) / 100);
  }
  return { events, batches, daily: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, vendas]) => ({ date, vendas })) };
}
