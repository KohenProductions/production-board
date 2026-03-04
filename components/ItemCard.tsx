"use client";

import type { ItemRecord, ItemStatus } from "@/types";
import { SectionType } from "@/types";
import { ItemRowImage } from "@/components/ItemRowImage";

const statusBadgeClass: Record<ItemStatus, string> = {
  OK: "badge-ok",
  MISSING: "badge-missing",
  BLOCKED: "status-blocked",
};

const statusDot: Record<ItemStatus, string> = {
  OK: "●",
  MISSING: "●",
  BLOCKED: "●",
};

interface ItemCardProps {
  item: ItemRecord;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-right flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
    >
      {(item.sectionType === SectionType.LOCATIONS || item.sectionType === SectionType.TALENT) && (
        <ItemRowImage itemId={item.id} title={item.title || "תמונות"} />
      )}
      <span className={`text-lg leading-none px-1.5 py-0.5 rounded ${statusBadgeClass[item.status]}`} title={item.status}>
        {statusDot[item.status]}
      </span>
      <span className="flex-1 truncate text-sm">{item.title || "ללא כותרת"}</span>
    </button>
  );
}
