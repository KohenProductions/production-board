-- CreateTable
CREATE TABLE "ProjectInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'CLIENT',
    "invitedByUserId" TEXT NOT NULL,
    "invitedUserId" TEXT,
    "invitedEmail" TEXT,
    "invitedUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_token_key" ON "ProjectInvite"("token");

-- CreateIndex
CREATE INDEX "ProjectInvite_projectId_idx" ON "ProjectInvite"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInvite_invitedByUserId_idx" ON "ProjectInvite"("invitedByUserId");

-- CreateIndex
CREATE INDEX "ProjectInvite_invitedUserId_idx" ON "ProjectInvite"("invitedUserId");

-- CreateIndex
CREATE INDEX "ProjectInvite_expiresAt_idx" ON "ProjectInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_projectId_invitedUserId_key" ON "ProjectInvite"("projectId", "invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_projectId_invitedEmail_key" ON "ProjectInvite"("projectId", "invitedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_projectId_invitedUsername_key" ON "ProjectInvite"("projectId", "invitedUsername");

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
