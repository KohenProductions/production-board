// components/AddShootDayForm.tsx
"use client";

import React, { useState } from "react";

type ApiShootDay = {
  id: string;
  projectId: string;
  title: string;
  date: string; // ISO string
  location: string | null;
  callTime: string | null;
  notes: string | null;
  createdAt: string;
  createdByUser: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
};

interface Props {
  projectId: string;
  onDone: () => void;
  onCreated?: (day: ApiShootDay) => void;
}

export function AddShootDayForm({ projectId, onDone, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD from <input type="date">
  const [location, setLocation] = useState("");
  const [callTime, setCallTime] = useState(""); // HH:MM
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!date.trim()) return;

    setLoading(true);
    try {
      const isoDate = new Date(`${date.trim()}T08:00:00.000Z`).toISOString();

      const res = await fetch(`/api/projects/${projectId}/shoot-days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          title: title.trim(),
          date: isoDate,
          location: location.trim() || null,
          callTime: callTime.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed (${res.status})`);
      }

      const j = (await res.json()) as { shootDay: ApiShootDay };
      setTitle("");
      setDate("");
      setLocation("");
      setCallTime("");
      setNotes("");
      onCreated?.(j.shootDay);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 max-w-md"
      dir="rtl"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">כותרת</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Shoot Day 1"
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">תאריך</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">מיקום</span>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Tel Aviv"
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Call Time</span>
        <input
          type="time"
          value={callTime}
          onChange={(e) => setCallTime(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bring batteries + ND filters"
          className="border border-gray-300 rounded px-3 py-2 min-h-[80px] bg-white dark:bg-gray-900"
          rows={3}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "שומר..." : "הוסף יום צילום"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}