-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "portalOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "portalOtpHash" TEXT;

