-- CreateTable
CREATE TABLE "ProposalTimelineStep" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalTimelineStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalTimelineStep_proposalId_idx" ON "ProposalTimelineStep"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalTimelineStep_sortOrder_idx" ON "ProposalTimelineStep"("sortOrder");

-- AddForeignKey
ALTER TABLE "ProposalTimelineStep" ADD CONSTRAINT "ProposalTimelineStep_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
