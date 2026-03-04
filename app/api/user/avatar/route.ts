export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";

  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  return token || null;
}

export async function POST(req: Request) {
  try {
    const token = getToken(req);

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token }
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    if (!("avatarUrl" in body)) {
      return NextResponse.json({ error: "Missing avatarUrl" }, { status: 400 });
    }
    const value = body.avatarUrl;
    const avatarUrl =
      value === null || value === "" ? null
      : typeof value === "string" ? value.trim() || null
      : null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl }
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updated.avatarUrl
    });

  } catch (error) {
    console.error("AVATAR ERROR:", error);

    return NextResponse.json(
      { error: "Avatar update failed" },
      { status: 500 }
    );
  }
}