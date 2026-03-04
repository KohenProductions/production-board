export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const data: {
      firstName?: string | null;
      lastName?: string | null;
      age?: number | null;
      email?: string | null;
      phone?: string | null;
      instagram?: string | null;
      facebook?: string | null;
    } = {};
    if (body.firstName !== undefined) data.firstName = body.firstName ?? null;
    if (body.lastName !== undefined) data.lastName = body.lastName ?? null;
    if (body.age !== undefined) data.age = body.age == null ? null : Number(body.age);
    if (body.email !== undefined) data.email = body.email ?? null;
    if (body.phone !== undefined) data.phone = body.phone ?? null;
    if (body.instagram !== undefined) data.instagram = body.instagram ?? null;
    if (body.facebook !== undefined) data.facebook = body.facebook ?? null;

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR:", error);
    return NextResponse.json(
      { error: "Profile update failed" },
      { status: 500 }
    );
  }
}
