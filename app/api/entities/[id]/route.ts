export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type UpdateEntityBody = {
  title?: string;
  status?: string;
  detailsJson?: string | null;
  tags?: string[];
};

async function requireEntityMemberAccess(entityId: string, userId: string) {
  const entity = await prisma.projectEntity.findUnique({
    where: { id: entityId },
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

  if (!entity) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const membership = entity.project.members[0] ?? null;

  if (!membership) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  return {
    ok: true as const,
    projectId: entity.projectId,
  };
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

  const { id: entityId } = await ctx.params;

  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  const access = await requireEntityMemberAccess(entityId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  const entity = await prisma.projectEntity.findUnique({
    where: { id: entityId },
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

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json({ entity });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: entityId } = await ctx.params;

  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  const access = await requireEntityMemberAccess(entityId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: UpdateEntityBody;

  try {
    body = (await req.json()) as UpdateEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    title?: string;
    status?: ItemStatus;
    detailsJson?: string;
    tags?: string[];
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    data.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    data.status = normalizeStatus(body.status);
  }

  if (Object.prototype.hasOwnProperty.call(body, "detailsJson")) {
    data.detailsJson =
      typeof body.detailsJson === "string" && body.detailsJson.trim()
        ? body.detailsJson
        : "{}";
  }

  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    data.tags = normalizeTags(body.tags);
  }

  const entity = await prisma.projectEntity.update({
    where: { id: entityId },
    data,
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
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: entityId } = await ctx.params;

  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  const access = await requireEntityMemberAccess(entityId, userId);

  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  await prisma.projectEntity.delete({
    where: { id: entityId },
  });

  return NextResponse.json({ success: true });
}