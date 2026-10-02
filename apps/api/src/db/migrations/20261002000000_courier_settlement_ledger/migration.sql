-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('IN', 'OUT');
-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('ORDER_REVENUE', 'DELIVERY_CHARGED', 'FREE_DELIVERY_ABSORBED', 'COD_EXPECTED', 'COD_RECEIVED', 'COURIER_DELIVERY_FEE', 'COURIER_COD_FEE', 'COURIER_RETURN_FEE', 'COURIER_PAYMENT', 'REFUND');
-- CreateEnum
CREATE TYPE "SettlementBatchStatus" AS ENUM ('OPEN', 'RECONCILED', 'PAID');
-- AlterTable
-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "courier" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "order_id" TEXT,
    "settlement_batch_id" TEXT,
    "memo" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "SettlementBatch" (
    "id" TEXT NOT NULL,
    "courier" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "SettlementBatchStatus" NOT NULL DEFAULT 'OPEN',
    "expected_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expected_fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "declared_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "declared_fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "notes" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "reconciled_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SettlementBatch_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "LedgerEntry_occurred_at_idx" ON "LedgerEntry"("occurred_at");
-- CreateIndex
CREATE INDEX "LedgerEntry_courier_occurred_at_idx" ON "LedgerEntry"("courier", "occurred_at");
-- CreateIndex
CREATE INDEX "LedgerEntry_type_occurred_at_idx" ON "LedgerEntry"("type", "occurred_at");
-- CreateIndex
CREATE INDEX "LedgerEntry_courier_type_occurred_at_idx" ON "LedgerEntry"("courier", "type", "occurred_at");
-- CreateIndex
CREATE INDEX "LedgerEntry_order_id_idx" ON "LedgerEntry"("order_id");
-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_source_type_source_id_type_key" ON "LedgerEntry"("source_type", "source_id", "type");
-- CreateIndex
CREATE INDEX "SettlementBatch_courier_period_start_idx" ON "SettlementBatch"("courier", "period_start");
-- CreateIndex
CREATE INDEX "SettlementBatch_status_period_start_idx" ON "SettlementBatch"("status", "period_start");
-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_settlement_batch_id_fkey" FOREIGN KEY ("settlement_batch_id") REFERENCES "SettlementBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
