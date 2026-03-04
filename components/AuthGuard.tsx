// components/AuthGuard.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PUBLIC_PATHS = ["/login", "/register", "/test-auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = useMemo(() => isPublicPath(pathname || "/"), [pathname]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (!data?.user) {
          const url = `/login?next=${encodeURIComponent(pathname || "/")}`;
          router.replace(url);
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPublic, pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-app opacity-70">בודק התחברות...</p>
      </div>
    );
  }

  return <>{children}</>;
}