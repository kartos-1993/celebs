-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "IdempotencyKey" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '24 hours';

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expiredAt" SET DEFAULT NOW() + interval '30 days';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "VendorProfile" DROP COLUMN "taxId",
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessPhoneNumber" TEXT,
ADD COLUMN     "businessRegDocumentUrl" TEXT,
ADD COLUMN     "businessRegNumber" TEXT,
ADD COLUMN     "citizenshipDocumentUrl" TEXT,
ADD COLUMN     "citizenshipNumber" TEXT NOT NULL,
ADD COLUMN     "holidayMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ownerPhotoUrl" TEXT,
ADD COLUMN     "panDocumentUrl" TEXT,
ADD COLUMN     "panNumber" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "storeLogo" TEXT,
ADD COLUMN     "vatDocumentUrl" TEXT;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "vendorProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nepal',
    "isBusinessAddress" BOOLEAN NOT NULL DEFAULT false,
    "isReturnAddress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warehouse_vendorProfileId_idx" ON "Warehouse"("vendorProfileId");

-- CreateIndex
CREATE INDEX "User_vendorId_idx" ON "User"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_phoneNumber_key" ON "VendorProfile"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_panNumber_key" ON "VendorProfile"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_citizenshipNumber_key" ON "VendorProfile"("citizenshipNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
