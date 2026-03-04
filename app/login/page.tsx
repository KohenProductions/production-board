"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    // ביטחון בסיסי: לא נותנים להפנות לכתובת חיצונית
    if (!n) return "/";
    if (n.startsWith("http://") || n.startsWith("https://")) return "/";
    if (!n.startsWith("/")) return "/";
    return n;
  }, [searchParams]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // כשנכנסים לדף - נבדוק אם כבר מחובר (כדי לא להיתקע על login)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) return;
        const data = await res.json();

        if (!cancelled && data?.user) {
          router.replace(nextPath);
        }
      } catch {
        // שקט – לא קריטי
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("חובה למלא שם משתמש וסיסמה");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "התחברות נכשלה");
        return;
      }

      // הצלחה → חוזרים לאיפה שבאנו
      router.replace(nextPath);
    } catch (err) {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 16,
          padding: 20,
          background: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          direction: "rtl",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          התחברות
        </h1>
        <p style={{ marginTop: 6, marginBottom: 16, opacity: 0.7 }}>
          התחבר כדי להמשיך
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>שם משתמש</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="הקלד שם משתמש"
              disabled={busy}
              style={{
                height: 42,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                padding: "0 12px",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>סיסמה</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="הקלד סיסמה"
              type="password"
              disabled={busy}
              style={{
                height: 42,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                padding: "0 12px",
                outline: "none",
              }}
            />
          </label>

          {error && (
            <div
              style={{
                background: "rgba(255,0,0,0.06)",
                border: "1px solid rgba(255,0,0,0.18)",
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              height: 44,
              borderRadius: 12,
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 700,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "מתחבר..." : "התחבר"}
          </button>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            אחרי התחברות נחזור ל: <span style={{ direction: "ltr" }}>{nextPath}</span>
          </div>
        </form>
      </div>
    </div>
  );
}