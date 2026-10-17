-- Record when a courier's statement actually arrived.
--
-- Both declared columns are NOT NULL DEFAULT 0, so "they declared nothing" and
-- "we never received their statement" were indistinguishable. A settlement could
-- therefore be reconciled and paid against money that had never been declared.
--
-- The model carries no @@map, so the table is the model name as written.
ALTER TABLE "SettlementBatch" ADD COLUMN "declared_at" TIMESTAMP(3);
