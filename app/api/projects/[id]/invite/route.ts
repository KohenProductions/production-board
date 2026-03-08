export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { randomBytes } from "crypto";

const INVITE_TTL_DAYS = 7;

type Body = {
  username?: string;
  email?: string;
  role?: "PRODUCER" | "DIRECTOR" | "PHOTOGRAPHER" | "CLIENT";
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const role = body.role ?? "CLIENT";

  if (!username && !email) {
    return NextResponse.json(
      { error: "username or email is required" },
      { status: 400 }
    );
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  if (membership.role !== "PRODUCER") {
    return NextResponse.json(
      { error: "Only PRODUCER can invite" },
      { status: 403 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const invitedUser = username
    ? await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, email: true },
      })
    : email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, username: true, email: true },
        })
      : null;

  if (invitedUser?.id === userId) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  if (invitedUser?.id) {
    const alreadyMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: invitedUser.id } },
      select: { id: true },
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "User is already a project member" },
        { status: 409 }
      );
    }
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = addDays(new Date(), INVITE_TTL_DAYS);

  try {
    const invite = await prisma.projectInvite.create({
      data: {
        token,
        projectId,
        role,
        invitedByUserId: userId,
        invitedUserId: invitedUser?.id ?? null,
        invitedEmail: email || invitedUser?.email || null,
        invitedUsername: username || invitedUser?.username || null,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        projectId: true,
        role: true,
        invitedEmail: true,
        invitedUsername: true,
        invitedUserId: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invite });
  } catch (err) {
    console.error("PROJECT_INVITE_CREATE_ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}