-- Seller statements: period-locked snapshots of what the platform owes a seller.
--
-- The ledger stays the source of truth, but a closed period is copied into a row
-- here once and never edited, so a refund posted in a later period cannot change
-- what a seller was told they had already earned.
--
-- locked_by and approved_by are separate columns because one person must not both
-- declare the figure and authorise the payout; the inequality is enforced in the
-- service, since a CHECK across two free-text columns would only catch NULLs.

CREATE TYPE "SellerStatementStatus" AS ENUM ('DRAFT', 'LOCKED', 'APPROVED', 'PAID', 'VOID');

CREATE TABLE "SellerStatement" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "SellerStatementStatus" NOT NULL DEFAULT 'DRAFT',

    "gross_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_costs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(12,2) NOT NULL DEFAULT 0,

    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),

    "payout_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by" TEXT,

    "notes" TEXT,

    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- camelCase on purpose, matching LedgerEntry and SettlementBatch. Prisma's
    -- schema has no @map on updatedAt, so a snake_case column here would be
    -- invisible to the client until every query on this table failed.
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerStatement_pkey" PRIMARY KEY ("id")
);

-- One statement per seller per period: two rows would each look authoritative.
CREATE UNIQUE INDEX "SellerStatement_vendor_id_period_start_key"
    ON "SellerStatement"("vendor_id", "period_start");

CREATE INDEX "SellerStatement_status_period_start_idx"
    ON "SellerStatement"("status", "period_start");

CREATE INDEX "SellerStatement_vendor_id_period_end_idx"
    ON "SellerStatement"("vendor_id", "period_end");

ALTER TABLE "SellerStatement"
    ADD CONSTRAINT "SellerStatement_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;