export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { ColorTag } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const MAX_PROJECTS_FREE = 3;

type CreateBody = {
  name?: string;
  clientName?: string | null;
  projectOrderIndex?: number | null;
  colorTag?: string | null;
};

function isValidColorTag(value: string): value is ColorTag {
  return Object.values(ColorTag).includes(value as ColorTag);
}

export async function GET(req: Request) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: {
      project: {
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
      },
    },
  });

  const projects = memberships
    .map((m) => m.project)
    .sort((a, b) => {
      const ai = a.projectOrderIndex ?? Number.MAX_SAFE_INTEGER;
      const bi = b.projectOrderIndex ?? Number.MAX_SAFE_INTEGER;

      if (ai !== bi) return ai - bi;

      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();

      if (ad !== bd) return ad - bd;

      return a.id.localeCompare(b.id);
    });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const count = await prisma.projectMember.count({
    where: { userId },
  });

  if (count >= MAX_PROJECTS_FREE) {
    return NextResponse.json(
      { error: "הגעת למגבלת 3 פרויקטים בגרסה החינמית" },
      { status: 403 }
    );
  }

  let body: CreateBody;

  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const clientName =
    body.clientName === null
      ? null
      : typeof body.clientName === "string"
        ? body.clientName.trim() || null
        : null;

  const projectOrderIndex =
    typeof body.projectOrderIndex === "number"
      ? body.projectOrderIndex
      : count + 1;

  let colorTag: ColorTag | null = null;

  if (body.colorTag === null || body.colorTag === undefined) {
    colorTag = null;
  } else if (typeof body.colorTag === "string" && isValidColorTag(body.colorTag)) {
    colorTag = body.colorTag;
  } else {
    return NextResponse.json({ error: "Invalid colorTag" }, { status: 400 });
  }

  try {
    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name,
          clientName,
          projectOrderIndex,
          colorTag,
          userId,
        },
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

      await tx.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId,
          role: "PRODUCER",
        },
      });

      return createdProject;
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("PROJECT_CREATE_ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}