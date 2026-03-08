// app/api/auth/login/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";
const SESSION_DAYS = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Keep response generic for security
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // NEW: block disabled users immediately (works even if TS types don't include isActive yet)
    if ((user as any).isActive === false) {
      return NextResponse.json(
        { error: "User is disabled" },
        { status: 403 }
      );
    }

    const ok = await bcryptjs.compare(password, user.password);

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { token, userId: user.id, expiresAt },
    });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    });

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}