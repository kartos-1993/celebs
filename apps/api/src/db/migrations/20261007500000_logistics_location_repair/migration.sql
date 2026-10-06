-- Repair a database whose logistics objects are missing entirely.
--
-- WHY THIS EXISTS
--
-- The squashed baseline 20250101000000_baseline_full_schema is recorded as applied
-- on the shared dev/staging database, and it did not apply: _prisma_migrations says
-- it succeeded, but LogisticsCity, LogisticsZone, LogisticsArea and ShippingRate
-- were never created there, neither was the DeliveryPricingSource enum, nor the
-- Order columns that reference it. That database was built from an earlier
-- migration lineage, and the baseline was then marked applied against it without
-- its DDL ever running.
--
-- The result is a history that lies. Everything after the baseline applied cleanly
-- - CommissionRule and the commission snapshots, LedgerEntry.vendor_id - so the gap
-- is invisible until something asks for a delivery location or a courier quote,
-- and then it fails with "relation does not exist" rather than "never migrated".
--
-- Every statement is guarded, because this has to be safe in both directions:
--
--   * On the drifted database the objects are absent, so each one is created.
--   * On a correct database - the local test database, and any environment created
--     from the baseline - everything below is a no-op and nothing is touched.
--
-- That is what lets one migration repair a drifted database and stay harmless on a
-- correct one, rather than being a script that only one environment can survive.
--
-- DELIBERATELY EXCLUDED
--
-- Diffing the drifted database against the schema also surfaced changes that are
-- not this migration's business and were left out on purpose:
--
--   * DROP COLUMN "Address"."is_deleted"      - destroys data, unrelated to delivery.
--   * DROP COLUMN "CommissionRule"."updated_at" - destroys data, unrelated to delivery.
--   * DEFAULT changes on Session.expiredAt and IdempotencyKey.expiresAt.
--
-- A database being behind is a reason to add what is missing, never a licence to
-- delete what we did not put there.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Only the two original values. COURIER_QUOTE is added by the migration that
-- follows this one, which is why the order of these two matters.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryPricingSource') THEN
        CREATE TYPE "DeliveryPricingSource" AS ENUM ('RATE_CARD', 'FALLBACK');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogisticsSource') THEN
        CREATE TYPE "LogisticsSource" AS ENUM ('BOOTSTRAP', 'COURIER');
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Order columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Order' AND column_name = 'courier_fee'
    ) THEN
        ALTER TABLE "Order"
            ADD COLUMN "courier_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
            ADD COLUMN "absorbed_shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
            ADD COLUMN "delivery_pricing_source" "DeliveryPricingSource" NOT NULL DEFAULT 'FALLBACK',
            ADD COLUMN "matched_shipping_rate_id" TEXT,
            ADD COLUMN "logistics_zone_id" TEXT,
            ADD COLUMN "total_billable_weight_kg" DECIMAL(8,3);
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Logistics location tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "LogisticsCity" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "is_valley" BOOLEAN NOT NULL DEFAULT false,
    "free_delivery_threshold" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "source" "LogisticsSource" NOT NULL DEFAULT 'BOOTSTRAP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsCity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LogisticsZone" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LogisticsArea" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShippingRate" (
    "id" TEXT NOT NULL,
    "city_id" TEXT,
    "min_weight_kg" DECIMAL(8,3) NOT NULL,
    "max_weight_kg" DECIMAL(8,3) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "cod_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- externalId is what the courier's location list is matched on, so it is unique.
-- Guarded because a drifted database might already hold rows with duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsCity_externalId_key" ON "LogisticsCity"("externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsZone_externalId_key" ON "LogisticsZone"("externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsArea_externalId_key" ON "LogisticsArea"("externalId");

CREATE INDEX IF NOT EXISTS "LogisticsCity_is_active_is_valley_idx" ON "LogisticsCity"("is_active", "is_valley");
CREATE INDEX IF NOT EXISTS "LogisticsCity_province_idx" ON "LogisticsCity"("province");
CREATE INDEX IF NOT EXISTS "LogisticsZone_city_id_is_active_idx" ON "LogisticsZone"("city_id", "is_active");
CREATE INDEX IF NOT EXISTS "LogisticsArea_zone_id_is_active_idx" ON "LogisticsArea"("zone_id", "is_active");

-- The rate lookup that used to price every delivery: bands for a city alongside
-- the general ones.
CREATE INDEX IF NOT EXISTS "ShippingRate_city_id_is_active_min_weight_kg_idx" ON "ShippingRate"("city_id", "is_active", "min_weight_kg");
CREATE INDEX IF NOT EXISTS "ShippingRate_is_active_min_weight_kg_idx" ON "ShippingRate"("is_active", "min_weight_kg");

CREATE INDEX IF NOT EXISTS "Address_logistics_zone_id_idx" ON "Address"("logistics_zone_id");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Address_logistics_zone_id_fkey'
    ) THEN
        ALTER TABLE "Address" ADD CONSTRAINT "Address_logistics_zone_id_fkey"
            FOREIGN KEY ("logistics_zone_id") REFERENCES "LogisticsZone"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LogisticsZone_city_id_fkey'
    ) THEN
        ALTER TABLE "LogisticsZone" ADD CONSTRAINT "LogisticsZone_city_id_fkey"
            FOREIGN KEY ("city_id") REFERENCES "LogisticsCity"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LogisticsArea_zone_id_fkey'
    ) THEN
        ALTER TABLE "LogisticsArea" ADD CONSTRAINT "LogisticsArea_zone_id_fkey"
            FOREIGN KEY ("zone_id") REFERENCES "LogisticsZone"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ShippingRate_city_id_fkey'
    ) THEN
        ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_city_id_fkey"
            FOREIGN KEY ("city_id") REFERENCES "LogisticsCity"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
