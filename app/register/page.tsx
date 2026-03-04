// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!username.trim() || !password) {
      setError("חובה למלא שם משתמש וסיסמה");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
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
        setError(data?.error || "הרשמה נכשלה");
        return;
      }

      setOkMsg("ההרשמה הושלמה בהצלחה. מעביר אותך לדף הבית...");
      setTimeout(() => router.replace("/"), 1500);
    } catch {
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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>הרשמה</h1>
        <p style={{ marginTop: 6, marginBottom: 16, opacity: 0.7 }}>
          צור משתמש כדי להמשיך
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
              autoComplete="new-password"
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

          {okMsg && (
            <div
              style={{
                background: "rgba(0,180,0,0.06)",
                border: "1px solid rgba(0,180,0,0.18)",
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
              }}
            >
              {okMsg}
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
            {busy ? "נרשם..." : "צור משתמש"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => router.push("/login")}
            style={{
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "transparent",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 700,
              opacity: busy ? 0.7 : 1,
            }}
          >
            יש לי כבר משתמש
          </button>
        </form>
      </div>
    </div>
  );
}