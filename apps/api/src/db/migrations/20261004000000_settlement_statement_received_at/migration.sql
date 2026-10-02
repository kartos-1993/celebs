-- Record when a courier's statement actually arrived.
--
-- Both declared columns are NOT NULL DEFAULT 0, so "they declared nothing" and
-- "we never received their statement" were indistinguishable. A settlement could
-- therefore be reconciled and paid against money that had never been declared.
ALTER TABLE "settlement_batches" ADD COLUMN "declared_at" TIMESTAMP(3);