export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

export async function GET(req: Request) {
  try {
    const token = req.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { token } });
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        username: session.user.username,
        avatarUrl: session.user.avatarUrl ?? null,
        firstName: session.user.firstName ?? null,
        lastName: session.user.lastName ?? null,
        age: session.user.age ?? null,
        email: session.user.email ?? null,
        phone: session.user.phone ?? null,
        instagram: session.user.instagram ?? null,
        facebook: session.user.facebook ?? null,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}