// app/api/auth/me/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

export async function GET() {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return NextResponse.json({ user: null }, { status: 200 });

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      // סשן פג תוקף → מוחקים ומחזירים null
      await prisma.session.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      { user: { id: session.user.id, username: session.user.username } },
      { status: 200 }
    );
  } catch (err) {
    console.error("ME_ERROR:", err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}