export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a project member" },
      { status: 403 }
    );
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ members });
}