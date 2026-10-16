/*
  Warnings:

  - You are about to drop the `QuickFilter` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "IdempotencyKey" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '24 hours';

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expiredAt" SET DEFAULT NOW() + interval '30 days';

-- DropTable
DROP TABLE "QuickFilter";

-- CreateTable
CREATE TABLE "StorefrontShortcut" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "filterConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontShortcut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontShortcut_slug_key" ON "StorefrontShortcut"("slug");

-- CreateIndex
CREATE INDEX "StorefrontShortcut_categoryId_idx" ON "StorefrontShortcut"("categoryId");
