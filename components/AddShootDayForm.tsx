"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { ShootDay } from "@/types";

interface Props {
  projectId: string;
  onDone: () => void;
  onCreated?: (day: ShootDay) => void;
}

export function AddShootDayForm({ projectId, onDone, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const addShootDay = useStore((s) => s.addShootDay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const day = await addShootDay({
      projectId,
      title: title.trim(),
      date: date.trim(),
      generalNotes: generalNotes.trim(),
    });
    setTitle("");
    setDate("");
    setGeneralNotes("");
    onDone();
    onCreated?.(day);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 max-w-md">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">כותרת (למשל: יום צילום 09/03)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="יום צילום 09/03"
          className="border border-gray-300 rounded px-3 py-2"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">תאריך</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">הערות כלליות</span>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="הערות..."
          className="border border-gray-300 rounded px-3 py-2 min-h-[60px]"
          rows={2}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          הוסף יום צילום
        </button>
        <button type="button" onClick={onDone} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
          ביטול
        </button>
      </div>
    </form>
  );
}
