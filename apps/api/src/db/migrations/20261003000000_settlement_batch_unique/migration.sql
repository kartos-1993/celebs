-- DropIndex
DROP INDEX "SettlementBatch_courier_period_start_idx";
-- AlterTable
-- CreateIndex
CREATE UNIQUE INDEX "SettlementBatch_courier_period_start_key" ON "SettlementBatch"("courier", "period_start");
