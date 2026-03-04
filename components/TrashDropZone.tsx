"use client";

import React from "react";
import type { CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";

export const TRASH_GAP = 14;
export const TRASH_WIDTH = 170;

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Fixed-position trash; same card height/padding/rounded/shadow as list cards. */
export function TrashDropZone({
  visible,
  anchor,
}: {
  visible: boolean;
  anchor: { top: number; left: number; height: number } | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });

  if (!visible || anchor == null) return null;

  const style: CSSProperties = {
    position: "fixed",
    top: anchor.top,
    left: anchor.left,
    height: anchor.height,
    width: TRASH_WIDTH,
    zIndex: 9999,
  };

  return (
    <div
      style={style}
      className="pointer-events-none transition-opacity duration-200"
    >
      <div
        ref={setNodeRef}
        className={[
          "pointer-events-auto w-full h-full min-h-0 flex flex-col justify-center",
          "p-4 rounded-lg border shadow-sm",
          "bg-white dark:bg-gray-800",
          "transition-all duration-200 ease-out origin-center",
          isOver
            ? "scale-[1.06] border-red-400 bg-rose-50 dark:bg-red-950/30 shadow-lg ring-2 ring-red-400/50 animate-[pulse_1.5s_ease-in-out_infinite]"
            : "border-gray-200 dark:border-gray-700 scale-100 opacity-[0.92]",
        ].join(" ")}
        style={{ transformOrigin: "center center" }}
      >
        <div
          className="flex flex-row items-center justify-center gap-3 w-full"
          dir="rtl"
        >
          <div
            className={[
              "flex-shrink-0 w-7 h-7 flex items-center justify-center transition-colors",
              isOver ? "text-red-500" : "text-gray-500 dark:text-gray-400",
            ].join(" ")}
          >
            <TrashIcon className="w-[26px] h-[26px]" />
          </div>
          <div className="flex flex-col items-end leading-tight min-w-0">
            <span
              className={[
                "text-sm font-semibold transition-colors",
                isOver ? "text-red-600" : "text-gray-600 dark:text-gray-400",
              ].join(" ")}
            >
              מחיקה
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              גרור לכאן
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
