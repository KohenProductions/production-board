/**
 * Server-side env validation. Ensures required variables are set at runtime.
 * Used before first DB access so deployment fails fast with a clear error.
 * Do not import this from client components.
 */
const REQUIRED_ENV = ["DATABASE_URL"] as const;

export function validateEnv(): void {
  if (typeof window !== "undefined") return;

  const missing: string[] = [];
  for (const key of REQUIRED_ENV) {
    const value = process.env[key];
    if (value === undefined || value.trim() === "") {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them in Vercel Project Settings → Environment Variables (or in .env for local dev)."
    );
  }
}
