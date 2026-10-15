-- AlterTable
ALTER TABLE "IdempotencyKey" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '24 hours';

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expiredAt" SET DEFAULT NOW() + interval '30 days';

-- RenameIndex
ALTER INDEX "LedgerEntry_vendor_id_occurredAt_idx" RENAME TO "LedgerEntry_vendor_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "LedgerEntry_vendor_id_type_occurredAt_idx" RENAME TO "LedgerEntry_vendor_id_type_occurred_at_idx";
