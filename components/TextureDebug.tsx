"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { applyTheme } from "@/lib/theme/applyTheme";

/** Temporary: toggle texture opacity to 0.35 to verify texture layer is visible. Remove when done debugging. */
export function TextureDebug() {
  const themeId = useStore((s) => s.themeId);
  const [boost, setBoost] = useState(false);
  return (
    <button
      type="button"
      className="text-xs opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded border border-app"
      title="Toggle texture opacity (debug)"
      onClick={() => {
        if (boost) {
          applyTheme(themeId ?? "b");
        } else {
          document.documentElement.style.setProperty("--app-texture-opacity", "0.35");
        }
        setBoost(!boost);
      }}
    >
      {boost ? "T✓" : "T"}
    </button>
  );
}
