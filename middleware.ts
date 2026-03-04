import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/test-auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next internals + static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  // Allow static assets by extension
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|ttf|eot)$/.test(pathname)) {
    return NextResponse.next();
  }

  // ✅ Allow ALL API routes (auth + future APIs). Auth is enforced inside /api/auth/* handlers.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Require session cookie
  const hasSession = req.cookies.get("pb_session")?.value;

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next).*)"],
};