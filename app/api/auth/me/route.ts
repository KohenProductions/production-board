// app/api/auth/me/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return hit.split("=").slice(1).join("=") || null;
}

export async function GET(req: Request) {
  try {
    const token = getCookie(req, COOKIE_NAME);
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
      await prisma.session.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: session.user.id,
          username: session.user.username,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ME_ERROR:", err);
    return NextResponse.json(
      { error: "ME_ERROR", user: null },
      { status: 500 }
    );
  }
}