-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "isPublicShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicSharedAt" TIMESTAMP(3),
ADD COLUMN     "publicShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_publicShareToken_key" ON "Proposal"("publicShareToken");

-- CreateIndex
CREATE INDEX "Proposal_publicShareToken_idx" ON "Proposal"("publicShareToken");
