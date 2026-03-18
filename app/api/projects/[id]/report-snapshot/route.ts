export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import type { ProjectPdfSnapshot } from "@/lib/reports/pdfSnapshotTypes";
import type { Project, ShootDay, Scene, Transition, ItemRecord } from "@/types";

async function requireProjectMember(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { id: true, role: true },
  });
  return membership;
}

function toProject(row: {
  id: string;
  name: string;
  clientName: string | null;
  projectOrderIndex: number | null;
  colorTag: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}): Project {
  return {
    id: row.id,
    name: row.name,
    clientName: row.clientName ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    projectOrderIndex: row.projectOrderIndex ?? undefined,
    ownerUserId: row.userId,
    colorTag: row.colorTag as Project["colorTag"],
  };
}

function toShootDay(row: {
  id: string;
  projectId: string;
  title: string;
  date: Date;
  notes: string | null;
  shootOrderIndex: number | null;
  colorTag: string | null;
}): ShootDay {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    date: row.date.toISOString(),
    generalNotes: row.notes ?? "",
    shootOrderIndex: row.shootOrderIndex ?? undefined,
    colorTag: row.colorTag as ShootDay["colorTag"],
  };
}

function toScene(row: {
  id: string;
  shootDayId: string;
  shootOrderNumber: number;
  scriptSceneNumber: string | null;
  name: string;
  status: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  detailsJson: string;
  colorTag: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Scene {
  return {
    id: row.id,
    shootDayId: row.shootDayId,
    shootOrderNumber: row.shootOrderNumber,
    scriptSceneNumber: row.scriptSceneNumber ?? undefined,
    name: row.name,
    status: row.status as Scene["status"],
    description: row.description ?? undefined,
    startTime: row.startTime ?? undefined,
    endTime: row.endTime ?? undefined,
    detailsJson: row.detailsJson,
    colorTag: row.colorTag as Scene["colorTag"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toItemRecord(row: {
  id: string;
  shootDayId: string;
  sceneId: string | null;
  sectionType: string;
  title: string;
  status: string;
  tags: string[];
  detailsJson: string;
  createdAt: Date;
  updatedAt: Date;
}): ItemRecord {
  return {
    id: row.id,
    shootDayId: row.shootDayId,
    sceneId: row.sceneId ?? undefined,
    sectionType: row.sectionType as ItemRecord["sectionType"],
    title: row.title,
    status: row.status as ItemRecord["status"],
    tags: row.tags ?? [],
    detailsJson: row.detailsJson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTransition(row: {
  id: string;
  shootDayId: string;
  afterSceneId: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Transition {
  return {
    id: row.id,
    shootDayId: row.shootDayId,
    afterSceneId: row.afterSceneId,
    startTime: row.startTime ?? undefined,
    endTime: row.endTime ?? undefined,
    title: row.title,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  if (!projectId) {
    return NextResponse.json(
      { error: "Project id is required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        clientName: true,
        projectOrderIndex: true,
        colorTag: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const shootDays = await prisma.shootDay.findMany({
      where: { projectId },
      orderBy: [{ shootOrderIndex: "asc" }, { date: "asc" }],
      select: {
        id: true,
        projectId: true,
        title: true,
        date: true,
        notes: true,
        shootOrderIndex: true,
        colorTag: true,
      },
    });

    const dayData: ProjectPdfSnapshot["dayData"] = {};

    for (const day of shootDays) {
      const [scenes, items, transitions] = await Promise.all([
        prisma.scene.findMany({
          where: { shootDayId: day.id },
          orderBy: [{ shootOrderNumber: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            shootDayId: true,
            shootOrderNumber: true,
            scriptSceneNumber: true,
            name: true,
            status: true,
            description: true,
            startTime: true,
            endTime: true,
            detailsJson: true,
            colorTag: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.item.findMany({
          where: { shootDayId: day.id },
          select: {
            id: true,
            shootDayId: true,
            sceneId: true,
            sectionType: true,
            title: true,
            status: true,
            tags: true,
            detailsJson: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.transition.findMany({
          where: { shootDayId: day.id },
          select: {
            id: true,
            shootDayId: true,
            afterSceneId: true,
            startTime: true,
            endTime: true,
            title: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      dayData[day.id] = {
        scenes: scenes.map(toScene),
        items: items.map(toItemRecord),
        transitions: transitions.map(toTransition),
      };
    }

    const snapshot: ProjectPdfSnapshot = {
      project: toProject(project),
      shootDays: shootDays.map(toShootDay),
      dayData,
    };

    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[report-snapshot]", err);
    return NextResponse.json(
      { error: "Failed to build report snapshot" },
      { status: 500 }
    );
  }
}
