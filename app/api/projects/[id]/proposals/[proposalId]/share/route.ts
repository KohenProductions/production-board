export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

async function requireProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { id: true, role: true },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; proposalId: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId, proposalId } = await ctx.params;
  if (!projectId || !proposalId) {
    return NextResponse.json(
      { error: "projectId and proposalId are required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: { enable?: boolean };
  try {
    body = (await req.json()) as { enable?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const enable = body.enable === true;

  const existing = await prisma.proposal.findFirst({
    where: { id: proposalId, projectId },
    select: {
      id: true,
      publicShareToken: true,
      isPublicShared: true,
      publicSharedAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (enable) {
    const token = existing.publicShareToken ?? crypto.randomBytes(32).toString("hex");
    const now = new Date();
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        publicShareToken: token,
        isPublicShared: true,
        publicSharedAt: existing.publicSharedAt ?? now,
      },
    });
    return NextResponse.json({
      publicShareToken: token,
      isPublicShared: true,
      publicSharedAt: existing.publicSharedAt ?? now.toISOString(),
    });
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { isPublicShared: false },
  });
  return NextResponse.json({
    publicShareToken: existing.publicShareToken,
    isPublicShared: false,
    publicSharedAt: existing.publicSharedAt?.toISOString() ?? null,
  });
}
