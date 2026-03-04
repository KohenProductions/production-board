"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [open, setOpen] = useState(false);
  const addProject = useStore((s) => s.addProject);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = await addProject({
      name: name.trim(),
      clientName: clientName.trim(),
    });
    setName("");
    setClientName("");
    setOpen(false);
    router.push(`/project/${project.id}`);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
      >
        + צור פרויקט
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">שם הפרויקט</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הפרויקט"
          className="border border-gray-300 rounded px-3 py-2 min-w-[200px]"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">שם הלקוח</span>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="שם הלקוח"
          className="border border-gray-300 rounded px-3 py-2 min-w-[180px]"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          צור
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
          ביטול
        </button>
      </div>
    </form>
  );
}
