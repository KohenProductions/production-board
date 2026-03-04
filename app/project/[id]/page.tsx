"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { AddShootDayForm } from "@/components/AddShootDayForm";
import { TrashDropZone, TRASH_GAP, TRASH_WIDTH } from "@/components/TrashDropZone";
import { downloadBlob } from "@/components/reports/pdfDownload";
import { fetchProjectPdf } from "@/lib/reports/fetchPdfFromApi";
import * as db from "@/lib/db";
import { ColorTagPicker, cardStyleForColorTag } from "@/components/ColorTagPicker";
import type { ShootDay } from "@/types";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const LOCAL_STORAGE_KEY_SHOOT_DAY = "lastDeletedShootDaySnapshot";

const collisionDetectionTrashFirst: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  const overTrash = byPointer.find((c) => c.id === "trash");
  if (overTrash) return [overTrash];
  return rectIntersection(args);
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    hydrated,
    projects,
    shootDays,
    loadProjects,
    loadShootDays,
    updateShootDay,
    deleteShootDay,
    restoreShootDay,
  } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [dateModalDayId, setDateModalDayId] = useState<string | null>(null);
  const [dateModalValue, setDateModalValue] = useState("");
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [trashAnchorRect, setTrashAnchorRect] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteFromIndex, setPendingDeleteFromIndex] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [lastDeletedShootDay, setLastDeletedShootDay] = useState<{
    day: ShootDay;
    index: number;
    shootOrderIndex: number | null;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SHOOT_DAY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { day: ShootDay; index: number; shootOrderIndex: number | null };
      return parsed?.day ? parsed : null;
    } catch {
      return null;
    }
  });

  const project = projects.find((p) => p.id === id);
  const days: ShootDay[] = shootDays[id] ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    if (!hydrated) return;
    loadProjects();
  }, [hydrated, loadProjects]);

  useEffect(() => {
    if (id && hydrated) loadShootDays(id);
  }, [id, hydrated, loadShootDays]);

  const handleExportPdf = useCallback(async () => {
    if (!id) return;
    setPdfExportLoading(true);
    try {
      const project = await db.getProject(id);
      if (!project) throw new Error("Project not found");
      const shootDays = await db.getShootDaysByProject(id);
      const dayData: Record<
        string,
        { scenes: Awaited<ReturnType<typeof db.getScenesByShootDay>>; items: Awaited<ReturnType<typeof db.getItemsByShootDay>>; transitions: Awaited<ReturnType<typeof db.getTransitionsByShootDay>> }
      > = {};
      for (const day of shootDays) {
        const [scenes, items, transitions] = await Promise.all([
          db.getScenesByShootDay(day.id),
          db.getItemsByShootDay(day.id),
          db.getTransitionsByShootDay(day.id),
        ]);
        dayData[day.id] = {
          scenes: scenes.sort((a, b) => a.shootOrderNumber - b.shootOrderNumber),
          items,
          transitions,
        };
      }
      const snapshot = { project, shootDays, dayData };
      const { blob, filename } = await fetchProjectPdf(snapshot);
      downloadBlob(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בייצוא PDF";
      window.alert(message);
    } finally {
      setPdfExportLoading(false);
    }
  }, [id]);

  const handleDayDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDayId(null);
      setTrashAnchorRect(null);

      if (over?.id === "trash") {
        const dayId = String(active.id);
        const fromIndex = days.findIndex((d) => d.id === dayId);
        setPendingDeleteId(dayId);
        setPendingDeleteFromIndex(fromIndex >= 0 ? fromIndex : null);
        setIsConfirmOpen(true);
        return;
      }

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const current = days;
      const oldIndex = current.findIndex((d) => d.id === activeId);
      const newIndex = current.findIndex((d) => d.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const ordered = arrayMove(current, oldIndex, newIndex);

      for (let i = 0; i < ordered.length; i += 1) {
        const desired = i + 1;
        if (ordered[i].shootOrderIndex !== desired) {
          // eslint-disable-next-line no-await-in-loop
          await updateShootDay(ordered[i].id, { shootOrderIndex: desired });
        }
      }

      const moved = ordered[newIndex];
      setDateModalDayId(moved.id);
      setDateModalValue(moved.date ?? "");
    },
    [days, updateShootDay]
  );

  const confirmDeleteDay = useCallback(() => {
    const dayId = pendingDeleteId;
    const fromIndex = pendingDeleteFromIndex;
    setPendingDeleteId(null);
    setPendingDeleteFromIndex(null);
    setIsConfirmOpen(false);
    if (dayId == null) return;
    const thatDay = days.find((d) => d.id === dayId);
    if (!thatDay) return;
    const snapshot = {
      day: thatDay,
      index: fromIndex ?? days.findIndex((d) => d.id === dayId),
      shootOrderIndex: thatDay.shootOrderIndex ?? null,
    };
    setLastDeletedShootDay(snapshot);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SHOOT_DAY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
    void deleteShootDay(dayId)
      .then(() => loadShootDays(id))
      .then(() => {
        const { shootDays: nextDays } = useStore.getState();
        const current = (nextDays[id] ?? []).slice();
        const sorted = current.sort(
          (a, b) => (a.shootOrderIndex ?? 999999) - (b.shootOrderIndex ?? 999999)
        );
        sorted.forEach((d, i) => {
          const desired = i + 1;
          if (d.shootOrderIndex !== desired) {
            void updateShootDay(d.id, { shootOrderIndex: desired });
          }
        });
      });
  }, [pendingDeleteId, pendingDeleteFromIndex, days, id, deleteShootDay, loadShootDays, updateShootDay]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-gray-500">פרויקט לא נמצא.</p>
        <Link
          href="/"
          className="text-blue-600 underline mt-2 inline-block"
        >
          חזרה לרשימה
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto bg-app text-app">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link
            href="/"
            className="text-app opacity-70 text-sm hover:underline"
          >
            ← כל הפרויקטים
          </Link>
          <h1 className="text-2xl font-bold mt-1 text-app">{project.name}</h1>
          {project.clientName && (
            <p className="text-app opacity-80">{project.clientName}</p>
          )}
        </div>
      </header>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pdfExportLoading}
          onClick={handleExportPdf}
          className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {pdfExportLoading ? "מייצא..." : "ייצא דוח פרויקט"}
        </button>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90"
          >
            + הוסף יום צילום
          </button>
        ) : (
          <AddShootDayForm
            projectId={id}
            onDone={() => setShowAdd(false)}
            onCreated={(day) => router.push(`/shoot-day/${day.id}`)}
          />
        )}
        <button
          type="button"
          disabled={!lastDeletedShootDay}
          onClick={() => {
            if (!lastDeletedShootDay) return;
            const snapshot = lastDeletedShootDay;
            void restoreShootDay(snapshot.day)
              .then(() => loadShootDays(id))
              .then(() => {
                const { shootDays: nextDays } = useStore.getState();
                const current = nextDays[id] ?? [];
                const sorted = [...current].sort(
                  (a, b) => (a.shootOrderIndex ?? 999999) - (b.shootOrderIndex ?? 999999)
                );
                sorted.forEach((d, i) => {
                  const desired = i + 1;
                  if (d.shootOrderIndex !== desired) {
                    void updateShootDay(d.id, { shootOrderIndex: desired });
                  }
                });
                setLastDeletedShootDay(null);
                localStorage.removeItem(LOCAL_STORAGE_KEY_SHOOT_DAY);
              });
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          שיחזור היום האחרון שנמחק
        </button>
      </div>
      {days.length === 0 ? (
        <ul className="space-y-2">
          <li className="text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-lg">
            אין ימי צילום. הוסף יום צילום למעלה.
          </li>
        </ul>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionTrashFirst}
          onDragStart={(event: DragStartEvent) => {
            setActiveDayId(event.active.id as string);
            if (typeof document !== "undefined") {
              const rowEl = document.querySelector(
                `[data-shoot-day-row-id="${event.active.id}"]`
              );
              const colEl = document.querySelector("[data-shoot-days-column]");
              if (rowEl && colEl) {
                const rowRect = rowEl.getBoundingClientRect();
                const colRect = colEl.getBoundingClientRect();
                setTrashAnchorRect({
                  top: rowRect.top,
                  left: colRect.right + TRASH_GAP,
                  height: rowRect.height,
                });
              } else {
                setTrashAnchorRect(null);
              }
            }
          }}
          onDragEnd={handleDayDragEnd}
          onDragCancel={() => {
            setActiveDayId(null);
            setTrashAnchorRect(null);
          }}
        >
          <div className="relative" data-shoot-days-column>
            <SortableContext
              items={days.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {days.map((day, index) => (
                  <SortableShootDayItem
                    key={day.id}
                    day={day}
                    index={index}
                  />
                ))}
              </ul>
            </SortableContext>
          </div>
          {typeof document !== "undefined" &&
            createPortal(
              <TrashDropZone
                visible={!!activeDayId}
                anchor={trashAnchorRect}
              />,
              document.body
            )}
          <DragOverlay>
            {activeDayId && (
              <ShootDayRow
                day={days.find((d) => d.id === activeDayId)!}
                index={days.findIndex((d) => d.id === activeDayId)}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-shoot-day-title"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-5 border border-gray-200 dark:border-gray-700"
            dir="rtl"
          >
            <h2
              id="confirm-delete-shoot-day-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              האם למחוק את יום הצילום?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              פעולה זו תמחק את יום הצילום.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteId(null);
                  setPendingDeleteFromIndex(null);
                  setIsConfirmOpen(false);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                לא
              </button>
              <button
                type="button"
                onClick={confirmDeleteDay}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                כן, למחוק
              </button>
            </div>
          </div>
        </div>
      )}
      {dateModalDayId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full mx-4 p-4 border border-gray-200 dark:border-gray-700"
            dir="rtl"
          >
            <h2 className="text-sm font-semibold mb-3">
              האם לשנות את תאריך יום הצילום?
            </h2>
            <label className="block mb-3">
              <span className="text-xs text-gray-600">תאריך</span>
              <input
                type="date"
                value={dateModalValue}
                onChange={(e) => setDateModalValue(e.target.value)}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDateModalDayId(null)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                לא עכשיו
              </button>
              <button
                type="button"
                onClick={() => setDateModalDayId(null)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                אחרי זה
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (dateModalDayId) {
                    await updateShootDay(dateModalDayId, {
                      date: dateModalValue,
                    });
                  }
                  setDateModalDayId(null);
                }}
                className="px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800"
              >
                עדכן תאריך
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SortableShootDayItem({
  day,
  index,
}: {
  day: ShootDay;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} data-shoot-day-row-id={day.id}>
      <ShootDayRow
        day={day}
        index={index}
        handleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function ShootDayRow({
  day,
  index,
  handleProps,
  isOverlay,
}: {
  day: ShootDay;
  index: number;
  handleProps?: React.HTMLAttributes<HTMLSpanElement>;
  isOverlay?: boolean;
}) {
  const updateShootDay = useStore((s) => s.updateShootDay);
  const cardStyle = cardStyleForColorTag(day.colorTag);

  const content = (
    <div className="flex items-center gap-2">
      <span
        {...(handleProps || {})}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none"
      >
        ⋮⋮
      </span>
      <div
        className="flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ColorTagPicker
          value={day.colorTag ?? null}
          onChange={(tag) => void updateShootDay(day.id, { colorTag: tag ?? undefined })}
        />
      </div>
      <span className="text-sm text-gray-500">{index + 1}.</span>
      <div>
        <span className="font-medium">{day.title}</span>
        {day.date && (
          <span className="text-gray-500 mr-2"> · {day.date}</span>
        )}
      </div>
    </div>
  );

  const cardClassName = "p-4 surface-app border border-app rounded-lg";
  if (isOverlay) {
    return (
      <div
        className={`${cardClassName} shadow-lg scale-[1.02]`}
        style={cardStyle}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/shoot-day/${day.id}`}
      className={`block ${cardClassName} hover:border-gray-300 hover:shadow-sm transition`}
      style={cardStyle}
    >
      {content}
    </Link>
  );
}
