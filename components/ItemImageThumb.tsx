"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemImage } from "@/types";

type Props = {
  images?: (ItemImage & { url?: string; thumbUrl?: string })[];
  title?: string;
  size?: number;
};

export function ItemImageThumb({ images = [], title = "תמונות", size = 46 }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const has = images.length > 0;
  const extra = Math.max(0, images.length - 1);

  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const shown = useMemo(() => images[index], [images, index]);

  function onOpen() {
    if (!has) return;
    setIndex(0);
    setLoaded(false);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        // RTL: חץ שמאלה -> תמונה הבאה
        if (images.length > 1 && index < images.length - 1) {
          setIndex((i) => Math.min(images.length - 1, i + 1));
          setLoaded(false);
        }
      } else if (e.key === "ArrowRight") {
        // RTL: חץ ימינה -> תמונה קודמת
        if (images.length > 1 && index > 0) {
          setIndex((i) => Math.max(0, i - 1));
          setLoaded(false);
        }
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, images.length, index]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="relative shrink-0"
        aria-label={`פתח גלריה: ${title}`}
        title={title}
      >
        <div
          className="overflow-hidden border border-app bg-white/10"
          style={{ width: size, height: size, borderRadius: 10 }}
        >
          {has ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[0].thumbUrl || images[0].url || ""}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-[11px] opacity-60">אין</div>
          )}
        </div>

        {extra > 0 && (
          <div
            className="absolute -bottom-1 -left-1 px-1.5 py-0.5 text-[11px] rounded-md border border-app bg-app/90"
            aria-label={`עוד ${extra} תמונות`}
          >
            +{extra}
          </div>
        )}
      </button>

      {open && shown?.url && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 transition-opacity"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl border border-app bg-app shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
              <div className="text-sm opacity-80">
                {title} ({index + 1}/{images.length})
              </div>
              <button
                type="button"
                onClick={close}
                className="px-3 py-1 rounded-lg border border-app hover:bg-white/10"
              >
                סגור
              </button>
            </div>

            <div className="p-4 grid gap-3">
              <div className="relative rounded-xl overflow-hidden border border-app bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shown.url}
                  alt={`${title} ${index + 1}`}
                  className={`w-full max-h-[70vh] object-contain bg-black/20 transition-opacity ${
                    loaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setLoaded(true)}
                />

                {!loaded && (
                  <div className="absolute inset-0 grid place-items-center bg-black/10">
                    <div className="w-10 h-10 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                  </div>
                )}

                {images.length > 1 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canPrev) return;
                        setIndex((i) => i - 1);
                        setLoaded(false);
                      }}
                      disabled={!canPrev}
                      className="px-3 py-2 rounded-lg border border-app bg-app/70 disabled:opacity-40"
                      aria-label="תמונה קודמת"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canNext) return;
                        setIndex((i) => i + 1);
                        setLoaded(false);
                      }}
                      disabled={!canNext}
                      className="px-3 py-2 rounded-lg border border-app bg-app/70 disabled:opacity-40"
                      aria-label="תמונה הבאה"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      type="button"
                      key={img.id}
                      onClick={() => setIndex(i)}
                      className="shrink-0"
                      aria-label={`בחר תמונה ${i + 1}`}
                    >
                      <div
                        className={`overflow-hidden border border-app ${
                          i === index ? "ring-2 ring-white/50" : ""
                        }`}
                        style={{ width: 56, height: 56, borderRadius: 10 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.thumbUrl || img.url || ""}
                          alt={`${title} thumb ${i + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

