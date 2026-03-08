"use client";

import React, { useState } from "react";

type ApiScene = {
  id: string;
  shootDayId: string;
  shootOrderNumber: number;
  scriptSceneNumber: string | null;
  name: string;
  status: "OK" | "MISSING" | "BLOCKED";
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  detailsJson: string;
  colorTag: string | null;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  shootDayId: string;
  onDone: () => void;
  onCreated?: (scene: ApiScene) => void;
}

export function AddSceneForm({ shootDayId, onDone, onCreated }: Props) {
  const [name, setName] = useState("");
  const [scriptSceneNumber, setScriptSceneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<"OK" | "MISSING" | "BLOCKED">("OK");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/shoot-days/${shootDayId}/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          name: name.trim(),
          scriptSceneNumber: scriptSceneNumber.trim() || null,
          description: description.trim() || null,
          startTime: startTime.trim() || null,
          endTime: endTime.trim() || null,
          status,
          detailsJson: "{}",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed (${res.status})`);
      }

      const j = (await res.json()) as { scene: ApiScene };

      setName("");
      setScriptSceneNumber("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setStatus("OK");

      onCreated?.(j.scene);
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
      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 max-w-xl"
      dir="rtl"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">שם הסצנה</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="סצנת פתיחה"
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
          autoFocus
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">מספר סצנה בתסריט</span>
          <input
            type="text"
            value={scriptSceneNumber}
            onChange={(e) => setScriptSceneNumber(e.target.value)}
            placeholder="12A"
            className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">שעת התחלה</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">שעת סיום</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">סטטוס</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "OK" | "MISSING" | "BLOCKED")}
          className="border border-gray-300 rounded px-3 py-2 bg-white dark:bg-gray-900"
        >
          <option value="OK">תקין</option>
          <option value="MISSING">חסר</option>
          <option value="BLOCKED">חסום</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">תיאור</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="מה קורה בסצנה, הערות, דרישות..."
          className="border border-gray-300 rounded px-3 py-2 min-h-[100px] bg-white dark:bg-gray-900"
          rows={4}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "שומר..." : "הוסף סצנה"}
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