-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('OK', 'MISSING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('LOCATIONS', 'SCENES', 'TALENT', 'SCHEDULE', 'CONTACTS', 'NOTES', 'ASSETS');

-- CreateEnum
CREATE TYPE "ColorTag" AS ENUM ('pastelRed', 'pastelYellow', 'pastelOrange', 'pastelSky', 'pastelBlue', 'pastelGreen', 'pastelLightGreen');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "colorTag" "ColorTag",
ADD COLUMN     "projectOrderIndex" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ShootDay" ADD COLUMN     "colorTag" "ColorTag",
ADD COLUMN     "shootOrderIndex" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "shootOrderNumber" INTEGER NOT NULL,
    "scriptSceneNumber" TEXT,
    "name" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'OK',
    "description" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "colorTag" "ColorTag",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transition" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "afterSceneId" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "sceneId" TEXT,
    "sectionType" "SectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'OK',
    "tags" TEXT[],
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scene_shootDayId_idx" ON "Scene"("shootDayId");

-- CreateIndex
CREATE INDEX "Scene_shootOrderNumber_idx" ON "Scene"("shootOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_shootDayId_shootOrderNumber_key" ON "Scene"("shootDayId", "shootOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Transition_afterSceneId_key" ON "Transition"("afterSceneId");

-- CreateIndex
CREATE INDEX "Transition_shootDayId_idx" ON "Transition"("shootDayId");

-- CreateIndex
CREATE INDEX "Item_shootDayId_idx" ON "Item"("shootDayId");

-- CreateIndex
CREATE INDEX "Item_sceneId_idx" ON "Item"("sceneId");

-- CreateIndex
CREATE INDEX "Item_sectionType_idx" ON "Item"("sectionType");

-- CreateIndex
CREATE INDEX "Project_projectOrderIndex_idx" ON "Project"("projectOrderIndex");

-- CreateIndex
CREATE INDEX "ShootDay_shootOrderIndex_idx" ON "ShootDay"("shootOrderIndex");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transition" ADD CONSTRAINT "Transition_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transition" ADD CONSTRAINT "Transition_afterSceneId_fkey" FOREIGN KEY ("afterSceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
