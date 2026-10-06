-- Split dispatch: introduce Consignment table and ConsignmentStatus enum.
--
-- WHY THIS EXISTS
--
-- Checkout now quotes and charges delivery per seller, because goods from different
-- sellers represent separate pickups. However, order dispatch previously created
-- only a single consignment for the entire order, resulting in multi-seller orders
-- paying for multiple pickups but booking only one.
--
-- This migration introduces the `Consignment` entity, allowing one order to have
-- multiple consignments (one per seller parcel). Each consignment tracks:
--   * vendor_id: seller attributing this parcel
--   * courier_fee: exact quoted fee for this seller parcel
--   * tracking_number and tracking_url: courier waybill tracking details
--   * amount_to_collect: exact paisas to collect on delivery for this parcel
--   * cod_amount: whole rupees sent in the courier wire payload
--   * status: independent consignment delivery lifecycle

-- ---------------------------------------------------------------------------
-- 1. ConsignmentStatus Enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsignmentStatus') THEN
        CREATE TYPE "ConsignmentStatus" AS ENUM ('CREATED', 'HANDED_OVER', 'DELIVERED', 'CANCELLED', 'RETURNED');
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 2. Consignment Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Consignment" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "courier_provider" TEXT NOT NULL DEFAULT 'PATHAO',
    "courier_name" TEXT NOT NULL DEFAULT 'Pathao',
    "tracking_number" TEXT NOT NULL,
    "tracking_url" TEXT,
    "courier_fee" DECIMAL(12,2) NOT NULL,
    "amount_to_collect" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cod_amount" DECIMAL(12,2),
    "status" "ConsignmentStatus" NOT NULL DEFAULT 'CREATED',
    "line_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dispatched_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignment_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3. Foreign Keys & Indexes
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Consignment_order_id_fkey'
    ) THEN
        ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_order_id_fkey"
            FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Consignment_vendor_id_fkey'
    ) THEN
        ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_vendor_id_fkey"
            FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Consignment_order_id_idx" ON "Consignment"("order_id");
CREATE INDEX IF NOT EXISTS "Consignment_vendor_id_idx" ON "Consignment"("vendor_id");
CREATE INDEX IF NOT EXISTS "Consignment_tracking_number_idx" ON "Consignment"("tracking_number");
CREATE INDEX IF NOT EXISTS "Consignment_status_idx" ON "Consignment"("status");
