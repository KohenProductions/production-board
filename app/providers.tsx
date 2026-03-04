"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { migrateScenesIfNeeded } from "@/lib/migrations";
import { migrateOwnerUserIdIfNeeded } from "@/lib/user-migration";
import { runAuditAndLog } from "@/lib/audit";

declare global {
  interface Window {
    PB_AUDIT?: () => Promise<import("@/lib/audit").AuditReport>;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { setHydrated, loadUsers, seedIfEmpty } = useStore();

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await migrateScenesIfNeeded();
      await migrateOwnerUserIdIfNeeded();
      await loadUsers();
      setHydrated(true);
    })();
  }, [setHydrated, loadUsers, seedIfEmpty]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      window.PB_AUDIT = runAuditAndLog;
    }
  }, []);

  return <>{children}</>;
}
