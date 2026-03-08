export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

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

  const shootDay = await prisma.shootDay.findUnique({
    where: { id: shootDayId },
    select: {
      id: true,
      projectId: true,
      title: true,
      date: true,
      location: true,
      callTime: true,
      notes: true,
      shootOrderIndex: true,
      colorTag: true,
      createdAt: true,
      updatedAt: true,
      createdByUser: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      },
    },
  });

  if (!shootDay) {
    return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
  }

  return NextResponse.json({ shootDay });
}

export async function PATCH(
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

  let body: {
    title?: string;
    location?: string | null;
    callTime?: string | null;
    notes?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    title?: string;
    location?: string | null;
    callTime?: string | null;
    notes?: string | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    data.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "location")) {
    data.location = normalizeNullableString(body.location);
  }

  if (Object.prototype.hasOwnProperty.call(body, "callTime")) {
    data.callTime = normalizeNullableString(body.callTime);
  }

  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    data.notes = normalizeNullableString(body.notes);
  }

  const shootDay = await prisma.shootDay.update({
    where: { id: shootDayId },
    data,
    select: {
      id: true,
      projectId: true,
      title: true,
      date: true,
      location: true,
      callTime: true,
      notes: true,
      shootOrderIndex: true,
      colorTag: true,
      createdAt: true,
      updatedAt: true,
      createdByUser: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      },
    },
  });

  return NextResponse.json({ shootDay });
}