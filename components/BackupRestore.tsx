"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { downloadBackup, importBackup } from "@/lib/backup";

export function BackupRestore() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleExport = async () => {
    try {
      await downloadBackup();
      showSuccess("גיבוי יוצא בהצלחה. הקובץ הורד.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "שגיאה בייצוא גיבוי.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      await importBackup(text);
      clearCache();
      await loadProjects();
      showSuccess("גיבוי שוחזר בהצלחה. כל הנתונים עודכנו.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "שגיאה בייבוא גיבוי.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
        aria-label="בחר קובץ גיבוי"
      />
      <button
        type="button"
        onClick={handleExport}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        ייצוא גיבוי
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        ייבוא גיבוי
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
    </div>
  );
}
