-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN     "store_code" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "has_battery_or_liquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_fragile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_non_returnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "package_height_cm" DOUBLE PRECISION,
ADD COLUMN     "package_length_cm" DOUBLE PRECISION,
ADD COLUMN     "package_weight_kg" DOUBLE PRECISION DEFAULT 0.3,
ADD COLUMN     "package_width_cm" DOUBLE PRECISION,
ADD COLUMN     "packaging_type" TEXT DEFAULT 'FLYER_SMALL',
ADD COLUMN     "warranty_period" TEXT,
ADD COLUMN     "warranty_policy" TEXT,
ADD COLUMN     "warranty_type" TEXT NOT NULL DEFAULT 'NO_WARRANTY';

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_store_code_key" ON "VendorProfile"("store_code");
