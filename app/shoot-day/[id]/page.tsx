"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { AddSceneForm } from "@/components/AddSceneForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ApiProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

type ApiUserLite = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

type ApiShootDay = {
  id: string;
  projectId: string;
  title: string;
  date: string;
  location: string | null;
  callTime: string | null;
  notes: string | null;
  shootOrderIndex: number | null;
  colorTag: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: ApiUserLite;
  project: ApiProject;
};

type PreviewEntity = {
  id: string;
  title: string;
  status: "OK" | "MISSING" | "BLOCKED";
  detailsJson: string;
};

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
  preview?: {
    locations: PreviewEntity[];
    talents: PreviewEntity[];
  };
};

type ProjectShootDayOption = {
  id: string;
  title: string;
  date: string;
};

type ShootDayEditorState = {
  title: string;
  date: string;
  location: string;
  callTime: string;
  notes: string;
};

function formatDateForDisplay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function statusLabel(status: ApiScene["status"]) {
  if (status === "MISSING") return "חסר";
  if (status === "BLOCKED") return "חסום";
  return "תקין";
}

function statusClasses(status: ApiScene["status"]) {
  if (status === "MISSING") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }

  if (status === "BLOCKED") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  return "bg-green-100 text-green-700 border border-green-200";
}

function parseTalentRole(detailsJson: string): string {
  try {
    const parsed = JSON.parse(detailsJson || "{}") as { role?: string };
    return typeof parsed.role === "string" ? parsed.role.trim() : "";
  } catch {
    return "";
  }
}

function buildLocationPreview(scene: ApiScene): string {
  const locations = scene.preview?.locations ?? [];
  if (locations.length === 0) return "";

  return locations[0]?.title?.trim() || "";
}

function buildTalentPreview(scene: ApiScene): string {
  const talents = scene.preview?.talents ?? [];
  if (talents.length === 0) return "";

  const firstTwo = talents.slice(0, 2).map((talent) => {
    const role = parseTalentRole(talent.detailsJson);
    return role ? `${talent.title} - ${role}` : talent.title;
  });

  const restCount = talents.length - firstTwo.length;

  if (restCount > 0) {
    return `${firstTwo.join(", ")} +${restCount}`;
  }

  return firstTwo.join(", ");
}

function buildShootDayEditor(shootDay: ApiShootDay): ShootDayEditorState {
  return {
    title: shootDay.title ?? "",
    date: toDateTimeLocalValue(shootDay.date ?? ""),
    location: shootDay.location ?? "",
    callTime: shootDay.callTime ?? "",
    notes: shootDay.notes ?? "",
  };
}

function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function ShootDayPage() {
  const params = useParams();
  const shootDayId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [shootDay, setShootDay] = useState<ApiShootDay | null>(null);
  const [scenes, setScenes] = useState<ApiScene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddScene, setShowAddScene] = useState(false);

  const [editingShootDay, setEditingShootDay] = useState(false);
  const [shootDayEditor, setShootDayEditor] = useState<ShootDayEditorState>({
    title: "",
    date: "",
    location: "",
    callTime: "",
    notes: "",
  });
  const [savingShootDay, setSavingShootDay] = useState(false);

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveModalSceneId, setMoveModalSceneId] = useState<string | null>(null);
  const [moveShootDaysLoading, setMoveShootDaysLoading] = useState(false);
  const [moveShootDays, setMoveShootDays] = useState<ProjectShootDayOption[]>([]);
  const [moveTargetShootDayId, setMoveTargetShootDayId] = useState<string>("");
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveModalError, setMoveModalError] = useState<string | null>(null);

  const loadShootDayPage = useCallback(async () => {
    if (!shootDayId) return;

    setLoading(true);
    setError(null);
    setShootDay(null);
    setScenes([]);

    try {
      const [shootDayRes, scenesRes] = await Promise.all([
        fetch(`/api/shoot-days/${shootDayId}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/shoot-days/${shootDayId}/scenes`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      if (!shootDayRes.ok) {
        const j = await shootDayRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load shoot day (${shootDayRes.status})`);
      }

      if (!scenesRes.ok) {
        const j = await scenesRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load scenes (${scenesRes.status})`);
      }

      const shootDayJson = (await shootDayRes.json()) as { shootDay: ApiShootDay };
      const scenesJson = (await scenesRes.json()) as { scenes: ApiScene[] };

      setShootDay(shootDayJson.shootDay ?? null);
      setShootDayEditor(
        shootDayJson.shootDay
          ? buildShootDayEditor(shootDayJson.shootDay)
          : {
              title: "",
              date: "",
              location: "",
              callTime: "",
              notes: "",
            }
      );
      setScenes(scenesJson.scenes ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [shootDayId]);

  useEffect(() => {
    void loadShootDayPage();
  }, [loadShootDayPage]);

  const backHref = useMemo(() => {
    if (shootDay?.projectId) return `/project/${shootDay.projectId}`;
    return "/";
  }, [shootDay?.projectId]);

  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
  }, [scenes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleScenesDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!over) return;
      if (moveModalOpen || moveSubmitting) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const currentSorted = [...scenes].sort(
        (a, b) => a.shootOrderNumber - b.shootOrderNumber
      );
      const oldIndex = currentSorted.findIndex((s) => s.id === activeId);
      const newIndex = currentSorted.findIndex((s) => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(currentSorted, oldIndex, newIndex).map((s, i) => {
        return { ...s, shootOrderNumber: i + 1 };
      });

      // Immediate UI feedback.
      setScenes(reordered);

      try {
        const orderedSceneIds = reordered.map((s) => s.id);
        const res = await fetch(
          `/api/shoot-days/${shootDayId}/scenes/reorder`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderedSceneIds }),
          }
        );

        const json = (await res.json().catch(() => null)) as { error?: string } | null;

        if (!res.ok) {
          throw new Error(json?.error || `Failed to reorder scenes (${res.status})`);
        }

        // Ensure order is consistent with server.
        await loadShootDayPage();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        window.alert(msg);
        await loadShootDayPage();
      }
    },
    [loadShootDayPage, moveModalOpen, moveSubmitting, scenes, shootDayId]
  );

  const saveShootDayDetails = useCallback(async () => {
    if (!shootDay?.id) return;

    const nextTitle = shootDayEditor.title.trim();

    if (!nextTitle) {
      window.alert("צריך להזין שם יום צילום.");
      return;
    }

    setSavingShootDay(true);

    try {
      const res = await fetch(`/api/shoot-days/${shootDay.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          date: shootDayEditor.date ? new Date(shootDayEditor.date).toISOString() : undefined,
          location: shootDayEditor.location.trim() || null,
          callTime: shootDayEditor.callTime.trim() || null,
          notes: shootDayEditor.notes.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to update shoot day (${res.status})`);
      }

      const updatedShootDay = (json?.shootDay ?? null) as ApiShootDay | null;

      if (!updatedShootDay) {
        throw new Error("Shoot day payload is missing");
      }

      setShootDay(updatedShootDay);
      setShootDayEditor(buildShootDayEditor(updatedShootDay));
      setEditingShootDay(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingShootDay(false);
    }
  }, [shootDay?.id, shootDayEditor]);

  const backToReadMode = useCallback(() => {
    if (!shootDay) return;
    setShootDayEditor(buildShootDayEditor(shootDay));
    setEditingShootDay(false);
  }, [shootDay]);

  const openMoveModal = useCallback(
    async (sceneId: string) => {
      if (!shootDay?.projectId) return;

      setMoveModalOpen(true);
      setMoveModalSceneId(sceneId);
      setMoveModalError(null);

      setMoveShootDaysLoading(true);
      setMoveShootDays([]);
      setMoveTargetShootDayId("");

      try {
        const res = await fetch(`/api/projects/${shootDay.projectId}/shoot-days`, {
          cache: "no-store",
          credentials: "include",
        });

        const json = (await res.json().catch(() => null)) as
          | { shootDays?: ProjectShootDayOption[]; error?: string }
          | null;

        if (!res.ok) {
          throw new Error(json?.error || `Failed to load shoot days (${res.status})`);
        }

        const otherShootDays = (json?.shootDays ?? [])
          .filter((d) => d.id !== shootDayId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setMoveShootDays(otherShootDays);
        setMoveTargetShootDayId(otherShootDays[0]?.id ?? "");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setMoveModalError(msg);
      } finally {
        setMoveShootDaysLoading(false);
      }
    },
    [shootDay?.projectId, shootDayId]
  );

  const confirmMoveScene = useCallback(async () => {
    if (!moveModalSceneId) return;
    if (!moveTargetShootDayId) return;

    setMoveSubmitting(true);
    setMoveModalError(null);

    try {
      const res = await fetch(`/api/scenes/${moveModalSceneId}/move`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetShootDayId: moveTargetShootDayId }),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(json?.error || `Failed to move scene (${res.status})`);
      }

      // Close modal first; the page reload will show the updated scene list.
      setMoveModalOpen(false);
      setMoveModalSceneId(null);

      await loadShootDayPage();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMoveModalError(msg);
    } finally {
      setMoveSubmitting(false);
    }
  }, [loadShootDayPage, moveModalSceneId, moveTargetShootDayId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-4 py-6 md:p-6 max-w-4xl mx-auto">
        <Link href={backHref} className="text-blue-600 underline text-sm">
          ← חזרה
        </Link>

        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}
        </div>

        <button
          type="button"
          onClick={loadShootDayPage}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          נסה שוב
        </button>
      </main>
    );
  }

  if (!shootDay) {
    return (
      <main className="min-h-screen px-4 py-6 md:p-6 max-w-4xl mx-auto">
        <Link href={backHref} className="text-blue-600 underline text-sm">
          ← חזרה
        </Link>
        <p className="mt-4 text-gray-500">יום צילום לא נמצא.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 md:p-6 max-w-4xl mx-auto bg-app text-app overflow-x-hidden md:overflow-x-visible">
      <Breadcrumbs
        items={[
          { label: "לוח הפקה", href: "/" },
          {
            label: shootDay.project?.name ?? "פרויקט",
            href: `/project/${shootDay.projectId}`,
          },
          { label: shootDay.title },
        ]}
      />

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href={backHref} className="text-app opacity-70 text-sm hover:underline">
              ← {shootDay.project?.name ?? "פרויקט"}
            </Link>

            {!editingShootDay ? (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-app">{shootDay.title}</h1>

                <button
                  type="button"
                  onClick={() => {
                    setShootDayEditor(buildShootDayEditor(shootDay));
                    setEditingShootDay(true);
                  }}
                  className="text-sm px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100"
                >
                  ערוך
                </button>
              </div>
            ) : (
              <div className="mt-3 w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block md:col-span-2">
                    <span className="text-sm text-gray-600">שם יום צילום</span>
                    <input
                      type="text"
                      value={shootDayEditor.title}
                      onChange={(e) =>
                        setShootDayEditor((prev) => ({ ...prev, title: e.target.value }))
                      }
                      disabled={savingShootDay}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-600">תאריך ושעה</span>
                    <input
                      type="datetime-local"
                      value={shootDayEditor.date}
                      onChange={(e) =>
                        setShootDayEditor((prev) => ({ ...prev, date: e.target.value }))
                      }
                      disabled={savingShootDay}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-600">לוקיישן</span>
                    <input
                      type="text"
                      value={shootDayEditor.location}
                      onChange={(e) =>
                        setShootDayEditor((prev) => ({ ...prev, location: e.target.value }))
                      }
                      disabled={savingShootDay}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-600">Call Time</span>
                    <input
                      type="text"
                      value={shootDayEditor.callTime}
                      onChange={(e) =>
                        setShootDayEditor((prev) => ({ ...prev, callTime: e.target.value }))
                      }
                      disabled={savingShootDay}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm text-gray-600">הערות</span>
                    <textarea
                      value={shootDayEditor.notes}
                      onChange={(e) =>
                        setShootDayEditor((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={4}
                      disabled={savingShootDay}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveShootDayDetails()}
                    disabled={savingShootDay}
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm w-full md:w-auto"
                  >
                    {savingShootDay ? "שומר..." : "שמור"}
                  </button>

                  <button
                    type="button"
                    onClick={backToReadMode}
                    disabled={savingShootDay}
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm w-full md:w-auto"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {!editingShootDay ? (
              <div className="mt-2 text-sm text-gray-500">
                {formatDateForDisplay(shootDay.date)}
              </div>
            ) : null}

            {!editingShootDay && (shootDay.location || shootDay.callTime) ? (
              <div className="mt-3 text-sm text-gray-600">
                {shootDay.location ? <span>{shootDay.location}</span> : null}
                {shootDay.location && shootDay.callTime ? (
                  <span className="mx-2">·</span>
                ) : null}
                {shootDay.callTime ? <span>Call Time: {shootDay.callTime}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2">
            {!showAddScene ? (
              <button
                type="button"
                onClick={() => setShowAddScene(true)}
                className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 w-full md:w-auto"
              >
                + הוסף סצנה
              </button>
            ) : null}

            <button
              type="button"
              onClick={loadShootDayPage}
              className="px-4 py-2 rounded-lg border border-app hover:opacity-90 w-full md:w-auto"
            >
              רענן
            </button>
          </div>
        </div>

        {!editingShootDay && shootDay.notes ? (
          <div className="mt-4 whitespace-pre-wrap text-gray-700">
            {shootDay.notes}
          </div>
        ) : null}
      </header>

      {showAddScene ? (
        <div className="mb-6">
          <AddSceneForm
            shootDayId={shootDayId}
            onDone={() => setShowAddScene(false)}
            onCreated={() => {
              setShowAddScene(false);
              void loadShootDayPage();
            }}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">סצנות</h2>
          <div className="text-sm text-gray-500">סה״כ {sortedScenes.length} סצנות</div>
        </div>

        {sortedScenes.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm">
            עדיין אין סצנות ליום הצילום הזה.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleScenesDragEnd}
          >
            <SortableContext
              items={sortedScenes.map((s) => String(s.id))}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {sortedScenes.map((scene, idx) => (
                  <SortableSceneItem
                    key={scene.id}
                    scene={scene}
                    idx={idx}
                    shootDayId={shootDayId}
                    openMoveModal={openMoveModal}
                    moveModalOpen={moveModalOpen}
                    moveSubmitting={moveSubmitting}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {moveModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="העברת סצנה ליום צילום אחר"
          onMouseDown={(e) => {
            if (moveSubmitting) return;
            if (e.target === e.currentTarget) setMoveModalOpen(false);
          }}
        >
          <div className="surface-app border border-app rounded-xl shadow-xl max-w-sm w-full p-4" dir="rtl">
            <h2 className="text-lg font-semibold text-app mb-3">העבר ליום צילום אחר</h2>

            {moveModalError ? (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {moveModalError}
              </p>
            ) : null}

            <label className="block">
              <span className="text-sm text-gray-600">בחר יום צילום</span>
              <select
                value={moveTargetShootDayId}
                onChange={(e) => setMoveTargetShootDayId(e.target.value)}
                disabled={moveShootDaysLoading || moveSubmitting || moveShootDays.length === 0}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
              >
                {moveShootDaysLoading ? <option value="">טוען...</option> : null}

                {moveShootDays.length === 0 && !moveShootDaysLoading ? (
                  <option value="">אין ימי צילום נוספים</option>
                ) : null}

                {moveShootDays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} · {formatDateShort(d.date)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (moveSubmitting) return;
                  setMoveModalOpen(false);
                  setMoveModalSceneId(null);
                  setMoveModalError(null);
                }}
                disabled={moveSubmitting}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm w-full sm:w-auto"
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={() => void confirmMoveScene()}
                disabled={moveSubmitting || moveShootDaysLoading || !moveTargetShootDayId}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm w-full sm:w-auto"
              >
                {moveSubmitting ? "מזיז..." : "אשר העברה"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SortableSceneItem({
  scene,
  idx,
  shootDayId,
  openMoveModal,
  moveModalOpen,
  moveSubmitting,
}: {
  scene: ApiScene;
  idx: number;
  shootDayId: string;
  openMoveModal: (sceneId: string) => void | Promise<void>;
  moveModalOpen: boolean;
  moveSubmitting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(scene.id),
    disabled: moveModalOpen || moveSubmitting,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const locationPreview = buildLocationPreview(scene);
  const talentPreview = buildTalentPreview(scene);

  return (
    <li ref={setNodeRef} style={style}>
      <Link
        href={`/shoot-day/${shootDayId}/scene/${scene.id}`}
        className="relative block p-4 pt-10 pl-10 rounded-lg border border-app surface-app hover:shadow-sm hover:opacity-95 transition"
      >
        <button
          type="button"
          disabled={moveModalOpen || moveSubmitting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void openMoveModal(scene.id);
          }}
          className="absolute top-3 left-3 z-10 whitespace-nowrap px-2 py-1 rounded-md border border-app surface-app text-app text-xs hover:opacity-90 disabled:opacity-50"
        >
          העבר ליום צילום אחר
        </button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none"
                onClick={(e) => e.preventDefault()}
              >
                ⋮⋮
              </span>

              <span className="text-sm text-gray-500">סצנה {idx + 1}</span>

              {scene.scriptSceneNumber ? (
                <span className="text-sm text-gray-500">
                  · תסריט {scene.scriptSceneNumber}
                </span>
              ) : null}

              <span
                className={`text-xs px-2 py-1 rounded-full ${statusClasses(
                  scene.status
                )}`}
              >
                {statusLabel(scene.status)}
              </span>
            </div>

            <div className="font-medium text-base mt-2">{scene.name}</div>

            {scene.description ? (
              <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {scene.description}
              </div>
            ) : null}

            {locationPreview ? (
              <div className="text-sm text-gray-600 mt-3">
                לוקיישן: {locationPreview}
              </div>
            ) : null}

            {talentPreview ? (
              <div className="text-sm text-gray-600 mt-1">
                שחקנים: {talentPreview}
              </div>
            ) : null}

            {(scene.startTime || scene.endTime) && (
              <div className="text-sm text-gray-600 mt-3">
                {scene.startTime ? <span>התחלה: {scene.startTime}</span> : null}
                {scene.startTime && scene.endTime ? (
                  <span className="mx-2">·</span>
                ) : null}
                {scene.endTime ? <span>סיום: {scene.endTime}</span> : null}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}