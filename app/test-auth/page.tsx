"use client";

import { useState } from "react";

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null);

  async function login() {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ron_test_final",
        password: "123456",
      }),
      credentials: "include", // חשוב מאוד
    });

    const data = await res.json();
    setResult(data);
  }

  async function me() {
    const res = await fetch("/api/auth/me", {
      credentials: "include", // חשוב מאוד
    });

    const data = await res.json();
    setResult(data);
  }

  async function logout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();
    setResult(data);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Auth Test</h1>

      <button onClick={login}>Login</button>
      <button onClick={me} style={{ marginLeft: 10 }}>
        Me
      </button>
      <button onClick={logout} style={{ marginLeft: 10 }}>
        Logout
      </button>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}