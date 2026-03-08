-- CreateTable
CREATE TABLE "ShootDay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "callTime" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "ShootDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShootDay_projectId_idx" ON "ShootDay"("projectId");

-- CreateIndex
CREATE INDEX "ShootDay_date_idx" ON "ShootDay"("date");

-- CreateIndex
CREATE INDEX "ShootDay_createdByUserId_idx" ON "ShootDay"("createdByUserId");

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
