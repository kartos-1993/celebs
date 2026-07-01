-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expiredAt" SET DEFAULT NOW() + interval '30 days';
