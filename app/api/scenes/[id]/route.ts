export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type UpdateSceneBody = {
  name?: string;
  scriptSceneNumber?: string | null;
  status?: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
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
    shootDayId: scene.shootDayId,
    projectId: scene.shootDay.projectId,
  };
}

function normalizeNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeItemStatus(value: unknown): ItemStatus {
  if (value === ItemStatus.MISSING) return ItemStatus.MISSING;
  if (value === ItemStatus.BLOCKED) return ItemStatus.BLOCKED;
  return ItemStatus.OK;
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sceneId } = await ctx.params;

  if (!sceneId) {
    return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
  }

  const access = await requireSceneMemberAccess(sceneId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  const scene = await buildSceneResponse(sceneId);

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json({ scene });
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
    return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
  }

  const access = await requireSceneMemberAccess(sceneId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: UpdateSceneBody;

  try {
    body = (await req.json()) as UpdateSceneBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    scriptSceneNumber?: string | null;
    status?: ItemStatus;
    description?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "scriptSceneNumber")) {
    data.scriptSceneNumber = normalizeNullableString(body.scriptSceneNumber);
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    data.description = normalizeNullableString(body.description);
  }

  if (Object.prototype.hasOwnProperty.call(body, "startTime")) {
    data.startTime = normalizeNullableString(body.startTime);
  }

  if (Object.prototype.hasOwnProperty.call(body, "endTime")) {
    data.endTime = normalizeNullableString(body.endTime);
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    data.status = normalizeItemStatus(body.status);
  }

  const scene = await prisma.scene.update({
    where: { id: sceneId },
    data,
  });

  const fullScene = await buildSceneResponse(scene.id);

  return NextResponse.json({ scene: fullScene });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sceneId } = await ctx.params;

  if (!sceneId) {
    return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
  }

  const access = await requireSceneMemberAccess(sceneId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  const sourceScene = await prisma.scene.findUnique({
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
    },
  });

  if (!sourceScene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const sourceLinks = await prisma.sceneEntityLink.findMany({
    where: { sceneId },
    select: {
      projectEntityId: true,
    },
  });

  const maxScene = await prisma.scene.findFirst({
    where: {
      shootDayId: sourceScene.shootDayId,
    },
    orderBy: {
      shootOrderNumber: "desc",
    },
    select: {
      shootOrderNumber: true,
    },
  });

  const nextOrderNumber = (maxScene?.shootOrderNumber ?? 0) + 1;

  const duplicated = await prisma.$transaction(async (tx) => {
    const createdScene = await tx.scene.create({
      data: {
        shootDayId: sourceScene.shootDayId,
        shootOrderNumber: nextOrderNumber,
        scriptSceneNumber: sourceScene.scriptSceneNumber,
        name: `${sourceScene.name} (עותק)`,
        status: sourceScene.status,
        description: sourceScene.description,
        startTime: sourceScene.startTime,
        endTime: sourceScene.endTime,
        detailsJson: sourceScene.detailsJson,
        colorTag: sourceScene.colorTag,
      },
      select: {
        id: true,
      },
    });

    if (sourceLinks.length > 0) {
      await tx.sceneEntityLink.createMany({
        data: sourceLinks.map((link) => ({
          sceneId: createdScene.id,
          projectEntityId: link.projectEntityId,
        })),
      });
    }

    return createdScene;
  });

  const scene = await buildSceneResponse(duplicated.id);

  return NextResponse.json({ scene });
}