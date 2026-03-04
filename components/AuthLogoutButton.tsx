"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="px-3 py-1.5 rounded-lg border border-app hover:bg-white/10 text-sm disabled:opacity-50"
      title="התנתקות מהמערכת"
    >
      {busy ? "מתנתק..." : "התנתק"}
    </button>
  );
}