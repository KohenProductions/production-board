"use client";

import type { ItemRecord } from "@/types";
import { SectionType, SECTION_LABELS } from "@/types";
import { ItemCard } from "./ItemCard";

const SECTION_ORDER: SectionType[] = [
  SectionType.LOCATIONS,
  SectionType.SCENES,
  SectionType.TALENT,
  SectionType.SCHEDULE,
  SectionType.CONTACTS,
  SectionType.NOTES,
  SectionType.ASSETS,
];

interface SectionPanelProps {
  sectionType: SectionType;
  items: ItemRecord[];
  onAdd: (sectionType: SectionType) => void;
  onOpenItem: (item: ItemRecord) => void;
}

export function SectionPanel({ sectionType, items, onAdd, onOpenItem }: SectionPanelProps) {
  const label = SECTION_LABELS[sectionType];
  const sectionItems = items.filter((i) => i.sectionType === sectionType);

  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-sm">{label}</h3>
        <button
          type="button"
          onClick={() => onAdd(sectionType)}
          className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          + הוסף
        </button>
      </header>
      <ul className="p-2 space-y-1 min-h-[80px]">
        {sectionItems.length === 0 ? (
          <li className="text-gray-400 text-sm py-2 text-center">אין פריטים</li>
        ) : (
          sectionItems.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} onClick={() => onOpenItem(item)} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export { SECTION_ORDER };
