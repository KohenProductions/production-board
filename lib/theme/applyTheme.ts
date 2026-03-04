import type { ThemeId } from "@/types";
import { THEMES } from "./themes";

export function applyTheme(themeId: ThemeId): void {
  if (typeof document === "undefined") return;
  const theme = THEMES[themeId];
  if (!theme) return;
  const t = theme.tokens;
  const root = document.documentElement;
  root.style.setProperty("--app-bg", t.bg);
  root.style.setProperty("--app-surface", t.surface);
  root.style.setProperty("--app-primary", t.primary);
  root.style.setProperty("--app-accent", t.accent);
  root.style.setProperty("--app-muted", t.muted);
  root.style.setProperty("--app-text", t.text);
  root.style.setProperty("--app-border", t.border);
  root.style.setProperty("--app-success-bg", t.successBg);
  root.style.setProperty("--app-success-text", t.successText);
  root.style.setProperty("--app-danger-bg", t.dangerBg);
  root.style.setProperty("--app-danger-text", t.dangerText);
}
