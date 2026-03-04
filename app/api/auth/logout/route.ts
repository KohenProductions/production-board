// app/api/auth/logout/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

export async function POST() {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;

    if (token) {
      await prisma.session.delete({ where: { token } }).catch(() => {});
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return res;
  } catch (err) {
    console.error("LOGOUT_ERROR:", err);
    return NextResponse.json({ success: true });
  }
}