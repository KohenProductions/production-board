import type { ItemDetails, ItemRecord, ItemWithDetails } from "@/types";
import { SectionType } from "@/types";
import { DEFAULT_DETAILS } from "@/types";

export function parseDetails(record: ItemRecord): ItemWithDetails {
  let details: ItemDetails["details"];
  try {
    details = JSON.parse(record.detailsJson) as ItemDetails["details"];
  } catch {
    details = { ...DEFAULT_DETAILS[record.sectionType] };
  }
  return {
    ...record,
    details,
  };
}

export function serializeDetails(
  sectionType: SectionType,
  details: ItemDetails["details"]
): string {
  return JSON.stringify(details);
}

export function recordFromItem(
  item: ItemWithDetails
): ItemRecord {
  return {
    id: item.id,
    shootDayId: item.shootDayId,
    sectionType: item.sectionType,
    title: item.title,
    status: item.status,
    tags: item.tags,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    detailsJson: serializeDetails(item.sectionType, item.details),
  };
}
