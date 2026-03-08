-- CreateEnum
CREATE TYPE "ProjectEntityType" AS ENUM ('LOCATIONS', 'TALENT', 'CREW', 'CONTACTS', 'ASSETS');

-- CreateEnum
CREATE TYPE "ProductionUpdateChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "ProductionUpdateRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'OPENED', 'REPLIED');

-- CreateTable
CREATE TABLE "ProjectEntity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityType" "ProjectEntityType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'OK',
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneEntityLink" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "projectEntityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionSenderProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderPhone" TEXT,
    "senderTitle" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSenderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shootDayId" TEXT,
    "senderProfileId" TEXT,
    "sentByUserId" TEXT NOT NULL,
    "subject" TEXT,
    "messageBody" TEXT NOT NULL,
    "channel" "ProductionUpdateChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUpdateRecipient" (
    "id" TEXT NOT NULL,
    "productionUpdateId" TEXT NOT NULL,
    "projectEntityId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "status" "ProductionUpdateRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionUpdateRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectEntity_projectId_idx" ON "ProjectEntity"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEntity_entityType_idx" ON "ProjectEntity"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "SceneEntityLink_sceneId_projectEntityId_key" ON "SceneEntityLink"("sceneId", "projectEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUpdateRecipient_productionUpdateId_projectEntityI_key" ON "ProductionUpdateRecipient"("productionUpdateId", "projectEntityId");

-- AddForeignKey
ALTER TABLE "ProjectEntity" ADD CONSTRAINT "ProjectEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntityLink" ADD CONSTRAINT "SceneEntityLink_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntityLink" ADD CONSTRAINT "SceneEntityLink_projectEntityId_fkey" FOREIGN KEY ("projectEntityId") REFERENCES "ProjectEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionSenderProfile" ADD CONSTRAINT "ProductionSenderProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionSenderProfile" ADD CONSTRAINT "ProductionSenderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_senderProfileId_fkey" FOREIGN KEY ("senderProfileId") REFERENCES "ProductionSenderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdateRecipient" ADD CONSTRAINT "ProductionUpdateRecipient_productionUpdateId_fkey" FOREIGN KEY ("productionUpdateId") REFERENCES "ProductionUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdateRecipient" ADD CONSTRAINT "ProductionUpdateRecipient_projectEntityId_fkey" FOREIGN KEY ("projectEntityId") REFERENCES "ProjectEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
