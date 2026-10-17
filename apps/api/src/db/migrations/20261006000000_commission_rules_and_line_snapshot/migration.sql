-- Commission: the platform's rate, and what each order line actually paid.
--
-- Three columns on OrderItem, all frozen at purchase. A superadmin changing the
-- rate must never alter what a seller already sold, so the rate that applied is
-- recorded on the line rather than looked up later.
--
-- seller_net_amount is ALWAYS subtotal minus commission_amount. It is never
-- computed as subtotal * (1 - rate): that rounds a third time and lands a paisa
-- away from the commission recorded beside it, and a ledger that drifts from the
-- payouts by a paisa at a time cannot be reconciled or explained to a seller.

-- Effective dating, not in-place edits. Changing the rate closes the current rule
-- with an effective_to and opens a new one, so history stays intact and a rule is
-- never silently rewritten underneath orders already placed.
CREATE TYPE "CommissionScope" AS ENUM ('GLOBAL', 'CATEGORY', 'VENDOR');

CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "scope" "CommissionScope" NOT NULL DEFAULT 'GLOBAL',
    "category_id" TEXT,
    "vendor_id" TEXT,

    -- A percentage to two decimals: 7.50 means seven and a half percent.
    "rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Null until published, so a draft cannot change anybody's price.
    "effective_from" TIMESTAMP(3),
    -- Set when a later rule replaces this one. Null while this is current.
    "effective_to" TIMESTAMP(3),

    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "description" TEXT,

    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommissionRule_scope_effective_from_idx" ON "CommissionRule"("scope", "effective_from");
CREATE INDEX "CommissionRule_category_id_is_active_idx" ON "CommissionRule"("category_id", "is_active");
CREATE INDEX "CommissionRule_vendor_id_is_active_idx" ON "CommissionRule"("vendor_id", "is_active");
-- Which rules are live. Partial, because closed rules are history and the
-- resolver only ever asks about current ones.
CREATE INDEX "CommissionRule_is_active_effective_to_idx" ON "CommissionRule"("is_active", "effective_to");

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "commission_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "seller_net_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- A seller's earnings page reads their lines newest first, with the commission
-- already deducted on each. Same column pair as the existing item-status index, so
-- it is named explicitly to stay unique.
-- OrderItem.createdAt has no @map, so the column is literally "createdAt".
CREATE INDEX "OrderItem_vendor_id_createdAt_earnings_idx" ON "OrderItem"("vendor_id", "createdAt");
