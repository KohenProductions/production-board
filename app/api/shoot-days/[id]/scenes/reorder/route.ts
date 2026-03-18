export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type ReorderBody = {
  orderedSceneIds?: string[];
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
            select: { id: true },
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

  return { ok: true as const, projectId: shootDay.projectId };
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
    return NextResponse.json({ error: "shootDayId is required" }, { status: 400 });
  }

  const access = await requireShootDayMemberAccess(shootDayId, userId);
  if (!access.ok) {
    if (access.reason === "not_found") {
      return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: ReorderBody;
  try {
    body = (await req.json()) as ReorderBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderedSceneIds = Array.isArray(body.orderedSceneIds)
    ? body.orderedSceneIds.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())
    : [];

  if (orderedSceneIds.length === 0) {
    return NextResponse.json(
      { error: "orderedSceneIds must be a non-empty array" },
      { status: 400 }
    );
  }

  const uniqueOrdered = Array.from(new Set(orderedSceneIds));

  // Ensure all scenes belong to this shoot day.
  const foundScenes = await prisma.scene.findMany({
    where: {
      id: { in: uniqueOrdered },
      shootDayId,
    },
    select: { id: true },
  });

  if (foundScenes.length !== uniqueOrdered.length) {
    return NextResponse.json(
      { error: "One or more scenes are not part of this shoot day" },
      { status: 400 }
    );
  }

  // Update order to 1..N by the provided order.
  try {
    await prisma.$transaction(
      uniqueOrdered.map((sceneId, index) => {
        const nextOrderNumber = index + 1;
        return prisma.scene.update({
          where: { id: sceneId },
          data: { shootOrderNumber: nextOrderNumber },
        });
      })
    );
  } catch (err) {
    console.error("SCENES_REORDER_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

