"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { THEMES, THEME_ORDER } from "@/lib/theme/themes";
import type { ThemeId } from "@/types";

export function ThemeSwitch() {
  const { themeId, setThemeId } = useStore();
  const current = themeId ?? "b";
  const t = THEMES[current]?.tokens;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="theme-switch" ref={containerRef}>
      <button
        type="button"
        className="theme-trigger-plain"
        aria-label="Choose theme"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span key={themeId} className="theme-trigger-strip theme-trigger-animate">
          <span className="sw" style={{ background: t?.bg }} />
          <span className="sw" style={{ background: t?.surface }} />
          <span className="sw" style={{ background: t?.primary }} />
          <span className="sw" style={{ background: t?.accent }} />
          <span className="sw" style={{ background: t?.muted }} />
          <span className="sw" style={{ background: t?.border }} />
          <span className="sw" style={{ background: t?.successBg }} />
          <span className="sw" style={{ background: t?.dangerBg }} />
        </span>
      </button>
      {open && (
        <div className="theme-menu surface-app border border-app">
          {THEME_ORDER.map((id) => {
            const t = THEMES[id]?.tokens;
            if (!t) return null;
            return (
              <button
                key={id}
                type="button"
                className="theme-option"
                aria-label={`Theme ${id}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setThemeId(id);
                  setOpen(false);
                }}
              >
                <span className="theme-strip">
                  <span className="sw" style={{ background: t.bg }} />
                  <span className="sw" style={{ background: t.surface }} />
                  <span className="sw" style={{ background: t.primary }} />
                  <span className="sw" style={{ background: t.accent }} />
                  <span className="sw" style={{ background: t.muted }} />
                  <span className="sw" style={{ background: t.border }} />
                  <span className="sw" style={{ background: t.successBg }} />
                  <span className="sw" style={{ background: t.dangerBg }} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
