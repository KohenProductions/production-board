import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pb_session";

export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  return token ?? null;
}

export async function getSessionUserId(req: Request): Promise<string | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.userId;
}
