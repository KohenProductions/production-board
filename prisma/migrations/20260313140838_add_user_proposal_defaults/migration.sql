-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultBusinessAddress" TEXT,
ADD COLUMN     "defaultBusinessEmail" TEXT,
ADD COLUMN     "defaultBusinessName" TEXT,
ADD COLUMN     "defaultBusinessPhone" TEXT,
ADD COLUMN     "defaultFooterText" TEXT,
ADD COLUMN     "defaultLogoUrl" TEXT,
ADD COLUMN     "defaultPaymentTerms" TEXT,
ADD COLUMN     "defaultVatRate" DECIMAL(6,2);
