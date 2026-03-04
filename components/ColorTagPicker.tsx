"use client";

import React, { useState, useRef, useEffect } from "react";
import { COLOR_TAG_HEX, type ColorTag } from "@/types";

const COLOR_OPTIONS: (ColorTag | null)[] = [
  null,
  "pastelRed",
  "pastelYellow",
  "pastelOrange",
  "pastelSky",
  "pastelBlue",
  "pastelGreen",
  "pastelLightGreen",
];

export interface ColorTagPickerProps {
  value: ColorTag | null | undefined;
  onChange: (tag: ColorTag | null) => void;
  /** Optional class for the trigger button. */
  className?: string;
}

export function ColorTagPicker({ value, onChange, className }: ColorTagPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const currentHex = value ? COLOR_TAG_HEX[value] : undefined;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 ${className ?? ""}`}
        style={
          currentHex
            ? { backgroundColor: currentHex, borderColor: currentHex }
            : undefined
        }
        aria-label="בחר צבע"
      >
        {!currentHex ? (
          <span className="text-gray-400 text-xs">●</span>
        ) : null}
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-50 py-2 px-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex flex-wrap gap-1"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-500"
          >
            ללא
          </button>
          {COLOR_OPTIONS.filter((c): c is ColorTag => c != null).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                onChange(tag);
                setOpen(false);
              }}
              className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
              style={{ backgroundColor: COLOR_TAG_HEX[tag], borderColor: COLOR_TAG_HEX[tag] }}
              aria-label={tag}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function cardStyleForColorTag(colorTag: ColorTag | null | undefined): {
  borderLeftWidth?: number;
  borderLeftColor?: string;
  backgroundColor?: string;
} {
  if (!colorTag) return {};
  const hex = COLOR_TAG_HEX[colorTag as ColorTag];
  return {
    borderLeftWidth: 4,
    borderLeftColor: hex,
    backgroundColor: `${hex}20`,
  };
}
