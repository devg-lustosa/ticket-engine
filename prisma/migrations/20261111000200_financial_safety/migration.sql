-- CreateEnum
CREATE TYPE "CheckoutState" AS ENUM ('CREATING', 'READY', 'UNKNOWN', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('STARTED', 'PENDING', 'DONE', 'FAILED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "paid_amount" DECIMAL(10,2),
ADD COLUMN     "unit_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "checkout_key" TEXT,
ADD COLUMN     "checkout_state" "CheckoutState",
ADD COLUMN     "coupon_reserved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gateway_net_amount" DECIMAL(10,2),
ADD COLUMN     "platform_fee_bps" INTEGER,
ADD COLUMN     "request_hash" TEXT,
ADD COLUMN     "stock_reserved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "reserved_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'STARTED',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_ticket_id_key" ON "refunds"("ticket_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_status_idx" ON "refunds"("payment_id", "status");

-- CreateIndex
CREATE INDEX "tickets_batch_id_status_idx" ON "tickets"("batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkout_key_key" ON "payments"("checkout_key");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
