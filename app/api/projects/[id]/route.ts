export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ColorTag, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(id, userId);

  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      clientName: true,
      projectOrderIndex: true,
      colorTag: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(id, userId);

  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    clientName?: string | null;
    projectOrderIndex?: number | null;
    colorTag?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.ProjectUpdateInput = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.clientName === null) {
    data.clientName = null;
  } else if (typeof body.clientName === "string") {
    data.clientName = body.clientName.trim() || null;
  }

  if (body.projectOrderIndex === null) {
    data.projectOrderIndex = null;
  } else if (typeof body.projectOrderIndex === "number") {
    data.projectOrderIndex = body.projectOrderIndex;
  }

  if (body.colorTag === null) {
    data.colorTag = null;
  } else if (typeof body.colorTag === "string") {
    const isValidColorTag = Object.values(ColorTag).includes(body.colorTag as ColorTag);

    if (!isValidColorTag) {
      return NextResponse.json({ error: "Invalid colorTag" }, { status: 400 });
    }

    data.colorTag = body.colorTag as ColorTag;
  }

  const project = await prisma.project.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      clientName: true,
      projectOrderIndex: true,
      colorTag: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can delete the project" },
      { status: 403 }
    );
  }

  await prisma.project.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}