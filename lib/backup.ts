import type { Project, ShootDay, ItemRecord, Scene, Transition } from "@/types";
import { db } from "./db";

const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  projects: Project[];
  shootDays: ShootDay[];
  items: ItemRecord[];
  scenes: Scene[];
  transitions: Transition[];
}

export async function exportBackup(): Promise<BackupData> {
  const [projects, shootDays, items, scenes, transitions] = await Promise.all([
    db.projects.toArray(),
    db.shootDays.toArray(),
    db.items.toArray(),
    db.scenes.toArray(),
    db.transitions.toArray(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    shootDays,
    items,
    scenes,
    transitions,
  };
}

export async function downloadBackup(): Promise<void> {
  const data = await exportBackup();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `production-board-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (
    typeof o.version !== "number" ||
    !Array.isArray(o.projects) ||
    !Array.isArray(o.shootDays) ||
    !Array.isArray(o.items)
  )
    return false;
  if (!Array.isArray(o.scenes)) (o as unknown as BackupData).scenes = [];
  if (!Array.isArray(o.transitions)) (o as unknown as BackupData).transitions = [];
  return true;
}

async function applyBackup(data: BackupData): Promise<void> {
  await db.transaction("rw", db.projects, db.shootDays, db.scenes, async () => {
    await db.scenes.clear();
    await db.shootDays.clear();
    await db.projects.clear();
    if (data.projects.length > 0) await db.projects.bulkPut(data.projects);
    if (data.shootDays.length > 0) await db.shootDays.bulkPut(data.shootDays);
    if (data.scenes.length > 0) await db.scenes.bulkPut(data.scenes);
  });
  await db.transaction("rw", db.items, db.transitions, async () => {
    await db.items.clear();
    await db.transitions.clear();
    if (data.items.length > 0) await db.items.bulkPut(data.items);
    if (data.transitions.length > 0) await db.transitions.bulkPut(data.transitions);
  });
}

export async function importBackup(jsonString: string): Promise<void> {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("קובץ גיבוי לא תקין (לא JSON).");
  }
  if (!isBackupData(data)) {
    throw new Error("קובץ גיבוי לא תקין (מבנה חסר).");
  }
  await applyBackup(data);
}

const CURRENT_BACKUP_VERSION = 1;

export async function restoreFromBackupData(data: BackupData): Promise<void> {
  if (typeof data.version !== "number" || data.version > CURRENT_BACKUP_VERSION) {
    throw new Error("הגיבוי לא תואם לגרסה הנוכחית.");
  }
  if (!Array.isArray(data.projects) || !Array.isArray(data.shootDays) || !Array.isArray(data.items)) {
    throw new Error("הגיבוי לא תואם לגרסה הנוכחית.");
  }
  if (!Array.isArray(data.scenes)) (data as BackupData).scenes = [];
  if (!Array.isArray(data.transitions)) (data as BackupData).transitions = [];
  await applyBackup(data);
}
