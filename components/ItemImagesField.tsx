"use client";

import { useEffect, useRef, useState } from "react";
import { compressImageFile } from "@/lib/imageClient";
import { deleteItemImage, getImagesByItem, putItemImage } from "@/lib/db";
import type { ItemImage } from "@/types";

type UiImage = ItemImage & { url: string; thumbUrl: string };

type Props = {
  itemId: string;
};

function uid() {
  return crypto.randomUUID();
}

function revokeAll(list: UiImage[]) {
  for (const img of list) {
    try {
      if (img.url) URL.revokeObjectURL(img.url);
      if (img.thumbUrl) URL.revokeObjectURL(img.thumbUrl);
    } catch {
      // ignore
    }
  }
}

export function ItemImagesField({ itemId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<UiImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const raw = await getImagesByItem(itemId);
    const ui: UiImage[] = raw.map((r) => ({
      ...r,
      url: URL.createObjectURL(r.blob),
      thumbUrl: URL.createObjectURL(r.thumbBlob),
    }));
    setImages((prev) => {
      revokeAll(prev);
      return ui;
    });
  }

  useEffect(() => {
    load();
    return () => {
      revokeAll(images);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const canAdd = images.length < 4 && !busy;

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const remaining = Math.max(0, 4 - images.length);
    const files = Array.from(list).slice(0, remaining);
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        try {
          const res = await compressImageFile(file);
          const rec: ItemImage = {
            id: uid(),
            itemId,
            blob: res.blob,
            thumbBlob: res.thumbBlob,
            width: res.width,
            height: res.height,
            sizeBytes: res.sizeBytes,
            mime: res.mime,
            createdAt: Date.now(),
          };
          await putItemImage(rec);
        } catch (e: any) {
          if (String(e?.message) === "MAX_15MB") {
            setError("עד 15MB");
          } else {
            setError("שגיאה בהעלאת תמונה");
          }
        }
      }
      await load();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("למחוק תמונה?")) return;
    setBusy(true);
    try {
      await deleteItemImage(id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const current = images[index];
    const other = images[target];
    const updatedCurrent: ItemImage = { ...current, createdAt: other.createdAt };
    const updatedOther: ItemImage = { ...other, createdAt: current.createdAt };
    await putItemImage(updatedCurrent);
    await putItemImage(updatedOther);
    await load();
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">תמונות</div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={!canAdd}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canAdd}
            className="px-3 py-1.5 rounded-lg border border-app hover:bg-white/10 disabled:opacity-50"
          >
            העלה תמונה
          </button>
      </div>
      </div>

      {!canAdd && (
        <div className="text-xs opacity-70">מקסימום 4 תמונות</div>
      )}

      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {images.map((img, idx) => {
          const canUp = idx > 0;
          const canDown = idx < images.length - 1;
          return (
            <div key={img.id} className="relative">
              <div
                className="overflow-hidden border border-app bg-white/10"
                style={{ borderRadius: 10, aspectRatio: "1 / 1" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbUrl} alt="thumb" className="h-full w-full object-cover" />
              </div>

              <div className="absolute -top-2 left-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={busy || !canUp}
                  className="w-6 h-6 rounded-full border border-app bg-app/90 hover:bg-app flex items-center justify-center text-[10px] disabled:opacity-40"
                  aria-label="העלה תמונה למעלה"
                  title="העלה למעלה"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={busy || !canDown}
                  className="w-6 h-6 rounded-full border border-app bg-app/90 hover:bg-app flex items-center justify-center text-[10px] disabled:opacity-40"
                  aria-label="הורד תמונה למטה"
                  title="הורד למטה"
                >
                  ↓
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={busy}
                className="absolute -top-2 -left-2 w-7 h-7 rounded-full border border-app bg-app/90 hover:bg-app flex items-center justify-center text-sm"
                aria-label="מחק תמונה"
                title="מחק"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] opacity-60">
        נשמר מקומית (Dexie). קומפרס אוטומטי לפני שמירה. מקסימום 15MB לקובץ.
      </div>
    </div>
  );
}

