export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

type Body = {
  token?: string;
};

export async function POST(req: Request) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      projectId: true,
      role: true,
      invitedUserId: true,
      invitedEmail: true,
      invitedUsername: true,
      expiresAt: true,
      acceptedAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // If the invite is tied to a specific user, enforce it
  if (invite.invitedUserId && invite.invitedUserId !== userId) {
    return NextResponse.json(
      { error: "This invite is not for your user" },
      { status: 403 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ensure user isn't already a member
      const existing = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        // Mark invite as accepted anyway, so it doesn't stay pending
        const updatedInvite = await tx.projectInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date(), invitedUserId: invite.invitedUserId ?? userId },
          select: {
            id: true,
            token: true,
            projectId: true,
            role: true,
            expiresAt: true,
            acceptedAt: true,
          },
        });

        return {
          alreadyMember: true,
          membership: null,
          invite: updatedInvite,
        };
      }

      const membership = await tx.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId,
          role: invite.role,
        },
        select: {
          id: true,
          projectId: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      });

      const updatedInvite = await tx.projectInvite.update({
        where: { id: invite.id },
        data: {
          acceptedAt: new Date(),
          // in case it was an email/username invite not linked to a user at creation time
          invitedUserId: invite.invitedUserId ?? userId,
        },
        select: {
          id: true,
          token: true,
          projectId: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
        },
      });

      return {
        alreadyMember: false,
        membership,
        invite: updatedInvite,
      };
    });

    return NextResponse.json({
      project: invite.project,
      ...result,
    });
  } catch (err) {
    console.error("INVITE_ACCEPT_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}