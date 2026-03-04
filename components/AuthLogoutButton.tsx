"use client";

import { useState } from "react";

type AuthLogoutButtonProps = {
  onAfterLogout?: () => void;
};

export function AuthLogoutButton({ onAfterLogout }: AuthLogoutButtonProps) {
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // גם אם יש כשל – עדיין ננסה “לנקות” את ה־UI
      if (!res.ok) {
        // אפשר להוסיף פה toast אם יש לך מערכת הודעות
      }

      onAfterLogout?.();

      // הכי חשוב: ריפרש קשיח כדי לאפס state של קומפוננטות/תפריטים
      window.location.assign("/login");
    } finally {
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