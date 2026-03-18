export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type MoveBody = {
  targetShootDayId?: string;
};

async function requireSceneMemberAccess(sceneId: string, userId: string) {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: {
      id: true,
      shootDayId: true,
      shootDay: {
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              members: {
                where: { userId },
                select: { id: true, role: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!scene) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const membership = scene.shootDay.project.members[0] ?? null;

  if (!membership) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  return {
    ok: true as const,
    sceneId: scene.id,
    currentShootDayId: scene.shootDayId,
    projectId: scene.shootDay.projectId,
  };
}

async function buildSceneResponse(sceneId: string) {
  return prisma.scene.findUnique({
    where: { id: sceneId },
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
      shootDay: {
        select: {
          id: true,
          title: true,
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sceneId } = await ctx.params;

  if (!sceneId) {
    return NextResponse.json(
      { error: "sceneId is required" },
      { status: 400 }
    );
  }

  const access = await requireSceneMemberAccess(sceneId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: MoveBody;

  try {
    body = (await req.json()) as MoveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetShootDayId =
    typeof body.targetShootDayId === "string"
      ? body.targetShootDayId.trim()
      : "";

  if (!targetShootDayId) {
    return NextResponse.json(
      { error: "targetShootDayId is required" },
      { status: 400 }
    );
  }

  if (targetShootDayId === access.currentShootDayId) {
    return NextResponse.json(
      { error: "Scene is already in this shoot day" },
      { status: 400 }
    );
  }

  const targetShootDay = await prisma.shootDay.findUnique({
    where: { id: targetShootDayId },
    select: { id: true, projectId: true },
  });

  if (!targetShootDay) {
    return NextResponse.json(
      { error: "Target shoot day not found" },
      { status: 404 }
    );
  }

  if (targetShootDay.projectId !== access.projectId) {
    return NextResponse.json(
      { error: "Cannot move scene to a shoot day in another project" },
      { status: 400 }
    );
  }

  const maxScene = await prisma.scene.findFirst({
    where: { shootDayId: targetShootDayId },
    orderBy: { shootOrderNumber: "desc" },
    select: { shootOrderNumber: true },
  });

  const nextOrderNumber = (maxScene?.shootOrderNumber ?? 0) + 1;

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      shootDayId: targetShootDayId,
      shootOrderNumber: nextOrderNumber,
    },
  });

  const scene = await buildSceneResponse(sceneId);

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json({ scene });
}
