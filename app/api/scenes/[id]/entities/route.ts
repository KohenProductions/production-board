export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ProjectEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type AttachEntityBody = {
  projectEntityId?: string;
};

type RemoveEntityBody = {
  linkId?: string;
};

async function requireSceneMemberAccess(sceneId: string, userId: string) {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: {
      id: true,
      shootDayId: true,
      shootDay: {
        select: {
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
    shootDayId: scene.shootDayId,
    projectId: scene.shootDay.projectId,
  };
}

function normalizeEntityType(value: string | null): ProjectEntityType | null {
  if (value === ProjectEntityType.LOCATIONS) return ProjectEntityType.LOCATIONS;
  if (value === ProjectEntityType.TALENT) return ProjectEntityType.TALENT;
  if (value === ProjectEntityType.CREW) return ProjectEntityType.CREW;
  if (value === ProjectEntityType.CONTACTS) return ProjectEntityType.CONTACTS;
  if (value === ProjectEntityType.ASSETS) return ProjectEntityType.ASSETS;
  return null;
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

  const url = new URL(req.url);
  const entityTypeParam = url.searchParams.get("entityType");
  const entityType = normalizeEntityType(entityTypeParam);

  if (entityTypeParam && !entityType) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const links = await prisma.sceneEntityLink.findMany({
    where: {
      sceneId,
      ...(entityType
        ? {
            projectEntity: {
              entityType,
            },
          }
        : {}),
    },
    orderBy: [
      { createdAt: "asc" },
      { projectEntity: { title: "asc" } },
    ],
    select: {
      id: true,
      sceneId: true,
      projectEntityId: true,
      createdAt: true,
      projectEntity: {
        select: {
          id: true,
          projectId: true,
          entityType: true,
          title: true,
          status: true,
          detailsJson: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ links });
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

  let body: AttachEntityBody;

  try {
    body = (await req.json()) as AttachEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectEntityId =
    typeof body.projectEntityId === "string" ? body.projectEntityId.trim() : "";

  if (!projectEntityId) {
    return NextResponse.json({ error: "projectEntityId is required" }, { status: 400 });
  }

  const entity = await prisma.projectEntity.findFirst({
    where: {
      id: projectEntityId,
      projectId: access.projectId,
    },
    select: {
      id: true,
    },
  });

  if (!entity) {
    return NextResponse.json(
      { error: "Project entity not found in this project" },
      { status: 404 }
    );
  }

  try {
    const link = await prisma.sceneEntityLink.create({
      data: {
        sceneId,
        projectEntityId,
      },
      select: {
        id: true,
        sceneId: true,
        projectEntityId: true,
        createdAt: true,
        projectEntity: {
          select: {
            id: true,
            projectId: true,
            entityType: true,
            title: true,
            status: true,
            detailsJson: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ link });
  } catch (err) {
    console.error("SCENE_ENTITY_LINK_CREATE_ERROR:", err);
    return NextResponse.json(
      { error: "Could not attach entity to scene" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  let body: RemoveEntityBody;

  try {
    body = (await req.json()) as RemoveEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const linkId = typeof body.linkId === "string" ? body.linkId.trim() : "";

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required" }, { status: 400 });
  }

  const existingLink = await prisma.sceneEntityLink.findFirst({
    where: {
      id: linkId,
      sceneId,
    },
    select: {
      id: true,
    },
  });

  if (!existingLink) {
    return NextResponse.json(
      { error: "Scene entity link not found" },
      { status: 404 }
    );
  }

  await prisma.sceneEntityLink.delete({
    where: {
      id: linkId,
    },
  });

  return NextResponse.json({ success: true });
}