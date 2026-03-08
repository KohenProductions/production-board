export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type CreateSceneBody = {
  shootOrderNumber?: number;
  scriptSceneNumber?: string | null;
  name?: string;
  status?: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  detailsJson?: string | null;
};

async function requireShootDayMemberAccess(shootDayId: string, userId: string) {
  const shootDay = await prisma.shootDay.findUnique({
    where: { id: shootDayId },
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
  });

  if (!shootDay) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const membership = shootDay.project.members[0] ?? null;
  if (!membership) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  return {
    ok: true as const,
    projectId: shootDay.projectId,
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: shootDayId } = await ctx.params;

  if (!shootDayId) {
    return NextResponse.json(
      { error: "shootDayId is required" },
      { status: 400 }
    );
  }

  const access = await requireShootDayMemberAccess(shootDayId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  const scenes = await prisma.scene.findMany({
    where: { shootDayId },
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
  });

  const sceneLinks = await prisma.sceneEntityLink.findMany({
    where: {
      scene: {
        shootDayId,
      },
      projectEntity: {
        entityType: {
          in: ["LOCATIONS", "TALENT"],
        },
      },
    },
    select: {
      sceneId: true,
      projectEntity: {
        select: {
          id: true,
          entityType: true,
          title: true,
          status: true,
          detailsJson: true,
        },
      },
    },
  });

  const previewMap = new Map<
    string,
    {
      locations: Array<{
        id: string;
        title: string;
        status: "OK" | "MISSING" | "BLOCKED";
        detailsJson: string;
      }>;
      talents: Array<{
        id: string;
        title: string;
        status: "OK" | "MISSING" | "BLOCKED";
        detailsJson: string;
      }>;
    }
  >();

  for (const link of sceneLinks) {
    const current = previewMap.get(link.sceneId) ?? {
      locations: [],
      talents: [],
    };

    const item = {
      id: link.projectEntity.id,
      title: link.projectEntity.title,
      status: link.projectEntity.status,
      detailsJson: link.projectEntity.detailsJson,
    };

    if (link.projectEntity.entityType === "LOCATIONS") {
      current.locations.push(item);
    }

    if (link.projectEntity.entityType === "TALENT") {
      current.talents.push(item);
    }

    previewMap.set(link.sceneId, current);
  }

  const scenesWithPreview = scenes.map((scene) => {
    const preview = previewMap.get(scene.id) ?? {
      locations: [],
      talents: [],
    };

    return {
      ...scene,
      preview,
    };
  });

  return NextResponse.json({ scenes: scenesWithPreview });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: shootDayId } = await ctx.params;

  if (!shootDayId) {
    return NextResponse.json(
      { error: "shootDayId is required" },
      { status: 400 }
    );
  }

  const access = await requireShootDayMemberAccess(shootDayId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: CreateSceneBody;

  try {
    body = (await req.json()) as CreateSceneBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let shootOrderNumber: number;

  if (
    typeof body.shootOrderNumber === "number" &&
    Number.isFinite(body.shootOrderNumber)
  ) {
    shootOrderNumber = Math.max(1, Math.floor(body.shootOrderNumber));
  } else {
    const lastScene = await prisma.scene.findFirst({
      where: { shootDayId },
      orderBy: { shootOrderNumber: "desc" },
      select: { shootOrderNumber: true },
    });

    shootOrderNumber = (lastScene?.shootOrderNumber ?? 0) + 1;
  }

  const scriptSceneNumber = normalizeNullableString(body.scriptSceneNumber);
  const description = normalizeNullableString(body.description);
  const startTime = normalizeNullableString(body.startTime);
  const endTime = normalizeNullableString(body.endTime);

  const detailsJson =
    typeof body.detailsJson === "string" && body.detailsJson.trim()
      ? body.detailsJson
      : "{}";

  const status = normalizeItemStatus(body.status);

  try {
    const scene = await prisma.scene.create({
      data: {
        shootDayId,
        shootOrderNumber,
        scriptSceneNumber,
        name,
        status,
        description,
        startTime,
        endTime,
        detailsJson,
      },
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
    });

    return NextResponse.json({ scene });
  } catch (err) {
    console.error("SCENE_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}