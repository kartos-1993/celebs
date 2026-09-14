-- Drop STRIPE from PaymentMethod (Stripe purged; COD + eSewa/Khalti wallets only).
-- Fail-safe: aborts if legacy STRIPE rows exist so they get an explicit backfill
-- decision instead of a silent remap. Audit prod first:
--   SELECT payment_method, count(*) FROM "Order" GROUP BY 1;
--   SELECT gateway, count(*) FROM "Payment" GROUP BY 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Order" WHERE "payment_method" = 'STRIPE')
     OR EXISTS (SELECT 1 FROM "Payment" WHERE "gateway" = 'STRIPE') THEN
    RAISE EXCEPTION 'Legacy STRIPE rows exist — backfill payment_method/gateway before dropping the enum value';
  END IF;
END $$;

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'KHALTI', 'ESEWA');
ALTER TABLE "Order" ALTER COLUMN "payment_method" TYPE "PaymentMethod" USING "payment_method"::text::"PaymentMethod";
ALTER TABLE "Payment" ALTER COLUMN "gateway" TYPE "PaymentMethod" USING "gateway"::text::"PaymentMethod";
DROP TYPE "PaymentMethod_old";
