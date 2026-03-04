// app/api/auth/register/route.ts
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
        { error: "חובה למלא שם משתמש וסיסמה" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "שם משתמש קצר מדי" }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "סיסמה קצרה מדי" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "שם המשתמש כבר תפוס" },
        { status: 409 }
      );
    }

    const hashed = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
      },
      select: { id: true, username: true },
    });

    // יוצרים סשן מיד אחרי רישום (כמו מערכת אמיתית)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
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
    console.error("REGISTER_ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}