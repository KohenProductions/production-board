import { exportBackup, type BackupData, restoreFromBackupData } from "./backup";
import { deleteBackup, listBackups, putBackup, type BackupRecord } from "./db";

const DEBOUNCE_MS = 2000;
const MIN_INTERVAL_MS = 10000;
const MAX_BACKUPS = 10;

let pendingTimeout: number | null = null;
let lastRunAt = 0;

const newId = () => crypto.randomUUID();

export function scheduleAutoBackup(): void {
  if (typeof window === "undefined") return;
  if (pendingTimeout !== null) window.clearTimeout(pendingTimeout);
  pendingTimeout = window.setTimeout(async () => {
    const now = Date.now();
    if (now - lastRunAt < MIN_INTERVAL_MS) return;
    try {
      await runBackup({ label: "אוטומטי", reason: "auto" });
      lastRunAt = Date.now();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("Auto-backup failed", err);
    } finally {
      pendingTimeout = null;
    }
  }, DEBOUNCE_MS);
}

/** Create a backup now (manual snapshot). */
export async function createManualBackup(): Promise<void> {
  await runBackup({ label: "ידני", reason: "manual" });
}

async function runBackup(opts: { label: string; reason: "auto" | "manual" }): Promise<void> {
  const data: BackupData = await exportBackup();
  const record: BackupRecord = {
    id: newId(),
    createdAt: new Date().toISOString(),
    label: opts.label,
    reason: opts.reason,
    data,
  };
  await putBackup(record);
  await enforceRetention();
}

async function enforceRetention(): Promise<void> {
  const all = await listBackups();
  if (all.length <= MAX_BACKUPS) return;
  const toDelete = all.slice(MAX_BACKUPS);
  await Promise.all(toDelete.map((b) => deleteBackup(b.id)));
}

export async function getBackups(): Promise<BackupRecord[]> {
  return listBackups();
}

export async function restoreBackupById(id: string): Promise<void> {
  const all = await listBackups();
  const record = all.find((b) => b.id === id);
  if (!record) throw new Error("גיבוי לא נמצא.");
  await restoreFromBackupData(record.data);
}

export async function deleteBackupById(id: string): Promise<void> {
  await deleteBackup(id);
}

