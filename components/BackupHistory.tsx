"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  createManualBackup,
  getBackups,
  restoreBackupById,
  deleteBackupById,
} from "@/lib/autoBackup";
import type { BackupRecord } from "@/lib/db";

function formatBackupDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

function backupLabel(b: BackupRecord): string {
  if (b.label) return b.label;
  return b.reason === "auto" ? "אוטומטי" : b.reason === "manual" ? "ידני" : "גיבוי";
}

export function BackupHistory() {
  const [open, setOpen] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const loadProjects = useStore((s) => s.loadProjects);
  const clearCache = useStore((s) => s.clearCache);

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 4000);
  };

  const showError = (text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const list = await getBackups();
      setBackups(list);
    } catch (err) {
      showError("שגיאה בטעינת נקודות השחזור.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setOpen(true);
    loadList();
  };

  const handleCreateNow = async () => {
    try {
      await createManualBackup();
      showSuccess("נוצרה נקודת שחזור.");
      await loadList();
    } catch (err) {
      showError(err instanceof Error ? err.message : "שגיאה ביצירת גיבוי.");
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm("לשחזר לגרסה הזו? זה יחליף את כל הנתונים הנוכחיים.")) return;
    try {
      await restoreBackupById(id);
      clearCache();
      await loadProjects();
      await loadList();
      showSuccess("שוחזר בהצלחה.");
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בשחזור.";
      showError(msg === "הגיבוי לא תואם לגרסה הנוכחית." ? msg : "שגיאה בשחזור.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("למחוק נקודת שחזור זו?")) return;
    try {
      await deleteBackupById(id);
      await loadList();
    } catch (err) {
      showError(err instanceof Error ? err.message : "שגיאה במחיקה.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        שחזור אחורה
      </button>
      {message && (
        <div
          role="alert"
          className={`text-sm px-3 py-1.5 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="נקודות שחזור">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">נקודות שחזור</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                סגור
              </button>
            </div>
            <button
              type="button"
              onClick={handleCreateNow}
              className="w-full mb-4 px-3 py-2 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
            >
              צור נקודת שחזור עכשיו
            </button>
            {loading ? (
              <p className="text-sm text-gray-500">טוען...</p>
            ) : backups.length === 0 ? (
              <p className="text-sm text-gray-500">אין נקודות שחזור. הגיבויים נוצרים אוטומטית אחרי שינויים.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {backups.map((b) => (
                  <li
                    key={b.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium">{formatBackupDate(b.createdAt)}</span>
                      <span className="text-xs text-gray-500 truncate">{backupLabel(b)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(b.id)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        שחזר
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="px-2 py-1 text-xs border border-red-400 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        מחק
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-gray-400">
              נשמרות עד 10 נקודות שחזור. שחזור מחליף את כל הנתונים הנוכחיים.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
