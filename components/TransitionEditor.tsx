"use client";

import { useState, useEffect } from "react";
import type { Transition } from "@/types";

const DEFAULT_TITLE = "מעבר לוקיישן";

function timeToMinutes(hhmm: string): number {
  if (!hhmm || hhmm.length < 5) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function TransitionEditor({
  shootDayId,
  afterSceneId,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  shootDayId: string;
  afterSceneId: string;
  existing: Transition | null;
  onSave: (t: { startTime?: string; endTime?: string; title: string; notes?: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [title, setTitle] = useState(existing?.title ?? DEFAULT_TITLE);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setStartTime(existing.startTime ?? "");
      setEndTime(existing.endTime ?? "");
      setTitle(existing.title ?? DEFAULT_TITLE);
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  const handleSave = () => {
    setError(null);
    if (startTime && endTime) {
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      if (end < start) {
        setError("שעת סיום חייבת להיות אחרי שעת התחלה.");
        return;
      }
    }
    onSave({ startTime: startTime || undefined, endTime: endTime || undefined, title: title || DEFAULT_TITLE, notes: notes || undefined });
    onClose();
  };

  const handleDelete = () => {
    if (existing && window.confirm("למחוק מעבר לוקיישן זה?")) {
      onDelete(existing.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="מעבר לוקיישן">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-4 border border-gray-200 dark:border-gray-700" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">מעבר לוקיישן</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm">
            סגור
          </button>
        </div>
        {error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="text-sm text-gray-600">שעת התחלה</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">שעת סיום</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">כותרת</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">הערות</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={handleSave} className="px-3 py-2 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600">
            שמור
          </button>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            ביטול
          </button>
          {existing && (
            <button type="button" onClick={handleDelete} className="px-3 py-2 text-sm border border-red-400 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              מחק
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
