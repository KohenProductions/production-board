"use client";

import { useEffect, useState } from "react";
import { getImagesByItem } from "@/lib/db";
import type { ItemImage } from "@/types";
import { ItemImageThumb } from "@/components/ItemImageThumb";

type UiImage = ItemImage & { url: string; thumbUrl: string };

export function ItemRowImage({ itemId, title }: { itemId: string; title: string }) {
  const [images, setImages] = useState<UiImage[]>([]);

  useEffect(() => {
    let alive = true;
    let prev: UiImage[] = [];

    async function load() {
      const raw = await getImagesByItem(itemId);
      const ui: UiImage[] = raw.map((r) => ({
        ...r,
        url: URL.createObjectURL(r.blob),
        thumbUrl: URL.createObjectURL(r.thumbBlob),
      }));

      if (!alive) {
        for (const img of ui) {
          try {
            URL.revokeObjectURL(img.url);
            URL.revokeObjectURL(img.thumbUrl);
          } catch {
            // ignore
          }
        }
        return;
      }

      for (const img of prev) {
        try {
          URL.revokeObjectURL(img.url);
          URL.revokeObjectURL(img.thumbUrl);
        } catch {
          // ignore
        }
      }
      prev = ui;
      setImages(ui);
    }

    load();

    return () => {
      alive = false;
      for (const img of prev) {
        try {
          URL.revokeObjectURL(img.url);
          URL.revokeObjectURL(img.thumbUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [itemId]);

  return <ItemImageThumb images={images} title={title} size={46} />;
}

