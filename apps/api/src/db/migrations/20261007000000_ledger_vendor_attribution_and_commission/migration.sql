-- Attribute every ledger entry to the seller it belongs to, and give commission
-- its own entry type.
--
-- The reason vendorId is on the entry rather than read through the order: Order
-- has no vendor column. An order is a basket and can hold items from several
-- sellers, so ORDER_REVENUE is posted once for the whole subtotal. A seller's
-- ledger derived by joining their order items would therefore show them another
-- seller's revenue - and on a 1,800 / 600 split, a seller who earned 600 would be
-- shown 2,400.
--
-- NULL on existing entries rather than backfilled. The existing rows are
-- order-scoped and cannot be attributed without re-deriving history from the
-- items, which would be a guess about money. Platform-level entries - courier
-- settlement, a refund spanning sellers - stay NULL because they are nobody's
-- revenue, and "not attributable" is the honest value there.

ALTER TABLE "LedgerEntry" ADD COLUMN "vendor_id" TEXT;

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A seller's ledger, newest first. Without this the most-hit query in the seller
-- dashboard is a sequential scan over every entry on the platform.
CREATE INDEX "LedgerEntry_vendor_id_occurredAt_idx" ON "LedgerEntry"("vendor_id", "occurred_at");

-- Per-type totals for one seller over a period, which is how an earnings summary
-- is built without loading every line.
CREATE INDEX "LedgerEntry_vendor_id_type_occurredAt_idx" ON "LedgerEntry"("vendor_id", "type", "occurred_at");

-- Commission is its own type, and is reversed with its own entry, so that a
-- refund can cancel it without touching the revenue it was taken from.
ALTER TYPE "LedgerEntryType" ADD VALUE 'COMMISSION';
