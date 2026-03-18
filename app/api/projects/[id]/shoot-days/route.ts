export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type CreateBody = {
  title?: string;
  date?: string; // ISO string
  location?: string;
  callTime?: string;
  notes?: string;
};

async function requireProjectMember(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { id: true, role: true },
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

  const { id: projectId } = await ctx.params;
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  const shootDays = await prisma.shootDay.findMany({
    where: { projectId },
    orderBy: { date: "asc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      date: true,
      location: true,
      callTime: true,
      notes: true,
      createdAt: true,
      createdByUser: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      scenes: {
        orderBy: { shootOrderNumber: "asc" },
        select: {
          id: true,
          shootOrderNumber: true,
          scriptSceneNumber: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ shootDays });
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
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const dateStr = typeof body.date === "string" ? body.date.trim() : "";
  if (!dateStr) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "date must be a valid ISO date string" },
      { status: 400 }
    );
  }

  const location =
    typeof body.location === "string" ? body.location.trim() : null;

  const callTime =
    typeof body.callTime === "string" ? body.callTime.trim() : null;

  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  try {
    const shootDay = await prisma.shootDay.create({
      data: {
        projectId,
        title,
        date,
        location,
        callTime,
        notes,
        createdByUserId: userId,
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        date: true,
        location: true,
        callTime: true,
        notes: true,
        createdAt: true,
        createdByUser: {
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

    return NextResponse.json({ shootDay });
  } catch (err) {
    console.error("SHOOTDAY_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}