export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ItemStatus, ProjectEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type CreateEntityBody = {
  entityType?: string;
  title?: string;
  status?: string;
  detailsJson?: string | null;
  tags?: string[];
};

async function requireProjectMember(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  return membership;
}

function normalizeEntityType(value: unknown): ProjectEntityType | null {
  if (value === ProjectEntityType.LOCATIONS) return ProjectEntityType.LOCATIONS;
  if (value === ProjectEntityType.TALENT) return ProjectEntityType.TALENT;
  if (value === ProjectEntityType.CREW) return ProjectEntityType.CREW;
  if (value === ProjectEntityType.CONTACTS) return ProjectEntityType.CONTACTS;
  if (value === ProjectEntityType.ASSETS) return ProjectEntityType.ASSETS;
  return null;
}

function normalizeStatus(value: unknown): ItemStatus {
  if (value === ItemStatus.MISSING) return ItemStatus.MISSING;
  if (value === ItemStatus.BLOCKED) return ItemStatus.BLOCKED;
  return ItemStatus.OK;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
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
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(projectId, userId);

  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const entityTypeParam = url.searchParams.get("entityType");
  const entityType = normalizeEntityType(entityTypeParam);

  if (entityTypeParam && !entityType) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const entities = await prisma.projectEntity.findMany({
    where: {
      projectId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: [
      { title: "asc" },
      { createdAt: "asc" },
    ],
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
  });

  return NextResponse.json({ entities });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(projectId, userId);

  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: CreateEntityBody;

  try {
    body = (await req.json()) as CreateEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entityType = normalizeEntityType(body.entityType);
  if (!entityType) {
    return NextResponse.json({ error: "entityType is required" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const detailsJson =
    typeof body.detailsJson === "string" && body.detailsJson.trim()
      ? body.detailsJson
      : "{}";

  const status = normalizeStatus(body.status);
  const tags = normalizeTags(body.tags);

  try {
    const entity = await prisma.projectEntity.create({
      data: {
        projectId,
        entityType,
        title,
        status,
        detailsJson,
        tags,
      },
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
    });

    return NextResponse.json({ entity });
  } catch (err) {
    console.error("PROJECT_ENTITY_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}