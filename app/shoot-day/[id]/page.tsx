"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { copyTextToClipboard } from "@/lib/clipboard";
import { buildWhatsAppSummary } from "@/lib/whatsapp-export";
import { downloadBlob } from "@/components/reports/pdfDownload";
import { fetchShootDayPdf } from "@/lib/reports/fetchPdfFromApi";
import * as db from "@/lib/db";
import { TransitionEditor } from "@/components/TransitionEditor";
import { TrashDropZone, TRASH_GAP, TRASH_WIDTH } from "@/components/TrashDropZone";
import { ColorTagPicker, cardStyleForColorTag } from "@/components/ColorTagPicker";
import { SectionType } from "@/types";
import type { Scene, Transition, ItemRecord } from "@/types";
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

const LOCAL_STORAGE_KEY_SCENE = "lastDeletedSceneSnapshot";

const collisionDetectionTrashFirst: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  const overTrash = byPointer.find((c) => c.id === "trash");
  if (overTrash) return [overTrash];
  return rectIntersection(args);
};

function formatSceneTimeRange(scene: Scene): string {
  const s = scene.startTime;
  const e = scene.endTime;
  if (s && e) return `${s}–${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

function formatTransitionTimeRange(t: Transition): string {
  const s = t.startTime;
  const e = t.endTime;
  if (s && e) return `${s}–${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

function summarizeTitles(items: Array<{ title: string }>, max = 6) {
  const titles = items
    .map(i => (i.title || "").trim())
    .filter(Boolean);

  const shown = titles.slice(0, max);
  const more = titles.length - shown.length;

  return more > 0
    ? `${shown.join(", ")} (+${more})`
    : shown.join(", ");
}

export default function ShootDayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    hydrated,
    projects,
    scenes,
    items,
    transitions,
    loadProjects,
    loadScenes,
    loadItems,
    loadTransitions,
    getShootDay,
    addScene,
    addTransition,
    updateTransition,
    deleteTransition,
    updateShootDay,
    updateScene,
    deleteScene,
    restoreScene,
  } = useStore();
  const [copySuccess, setCopySuccess] = useState(false);
  const [trashAnchorRect, setTrashAnchorRect] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [pendingDeleteSceneId, setPendingDeleteSceneId] = useState<string | null>(null);
  const [pendingDeleteFromIndex, setPendingDeleteFromIndex] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lastDeletedScene, setLastDeletedScene] = useState<{
    scene: Scene;
    index: number;
    shootOrderNumber: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SCENE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { scene: Scene; index: number; shootOrderNumber: number };
      return parsed?.scene ? parsed : null;
    } catch {
      return null;
    }
  });
  const [shootDay, setShootDay] = useState<{
    id: string;
    projectId: string;
    title: string;
    date: string;
    generalNotes: string;
  } | null>(null);
  const [shootDayNotFound, setShootDayNotFound] = useState(false);
  const [transitionEditor, setTransitionEditor] = useState<{ afterSceneId: string; existing: Transition | null } | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(() => new Set());
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);

  const projectId = shootDay?.projectId;
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const dayScenes: Scene[] = scenes[id] ?? [];
  const dayItems = items[id] ?? [];
  const dayTransitions: Transition[] = transitions[id] ?? [];

  const sortedScenes = [...dayScenes].sort(
    (a, b) => a.shootOrderNumber - b.shootOrderNumber
  );

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
    if (!id || !hydrated) return;
    getShootDay(id).then((day) => {
      if (day) {
        setShootDay(day);
        setTitle(day.title ?? "");
        setDate(day.date ?? "");
        setNotes(day.generalNotes ?? "");
        setShootDayNotFound(false);
        loadScenes(day.id);
        loadTransitions(day.id);
      } else {
        setShootDayNotFound(true);
      }
    });
  }, [id, hydrated, getShootDay, loadScenes, loadTransitions]);

  useEffect(() => {
    if (id && hydrated) loadItems(id);
  }, [id, hydrated, loadItems]);

  // Debounced autosave for shoot day fields
  useEffect(() => {
    if (!hydrated || !shootDay) return;
    const handle = window.setTimeout(() => {
      const trimmedTitle = title.trim();
      const safeTitle = trimmedTitle || "יום צילום";
      let safeDate = date;
      if (safeDate && Number.isNaN(Date.parse(safeDate))) {
        safeDate = "";
      }
      updateShootDay(shootDay.id, {
        title: safeTitle,
        date: safeDate,
        generalNotes: notes,
      });
      if (safeTitle !== title) {
        setTitle(safeTitle);
      }
      if (safeDate !== date) {
        setDate(safeDate);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [hydrated, shootDay, title, date, notes, updateShootDay]);

  const handleAddScene = useCallback(async () => {
    const name = window.prompt("שם סצנה (אופציונלי):") || "";
    const scriptSceneNumber = window.prompt("מספר סצנה בתסריט (אופציונלי):") || "";
    const nextOrder = (dayScenes?.length ?? 0) + 1;
    const scene = await addScene({
      shootDayId: id,
      shootOrderNumber: nextOrder,
      scriptSceneNumber: scriptSceneNumber || undefined,
      name,
      status: "OK",
      detailsJson: JSON.stringify({}),
    });
    router.push(`/shoot-day/${id}/scene/${scene.id}`);
  }, [addScene, dayScenes?.length, id, router]);

  const handleExportWhatsApp = useCallback(async () => {
    if (!shootDay) return;
    const text = buildWhatsAppSummary(shootDay, dayScenes, dayItems, dayTransitions);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  }, [shootDay, dayScenes, dayItems, dayTransitions]);

  const handleExportPdf = useCallback(async () => {
    if (!id) return;
    setPdfExportLoading(true);
    try {
      const shootDay = await db.getShootDay(id);
      if (!shootDay) throw new Error("Shoot day not found");
      const project = await db.getProject(shootDay.projectId);
      if (!project) throw new Error("Project not found");
      const scenes = await db.getScenesByShootDay(id);
      const items = await db.getItemsByShootDay(id);
      const transitions = await db.getTransitionsByShootDay(id);
      const snapshot = {
        project,
        shootDay,
        scenes: scenes.sort((a, b) => a.shootOrderNumber - b.shootOrderNumber),
        items,
        transitions,
      };
      const { blob, filename } = await fetchShootDayPdf(snapshot);
      downloadBlob(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בייצוא PDF";
      window.alert(message);
    } finally {
      setPdfExportLoading(false);
    }
  }, [id]);

  const getTransitionAfter = useCallback(
    (sceneId: string) => dayTransitions.find((t) => t.afterSceneId === sceneId),
    [dayTransitions]
  );

  const handleSaveTransition = useCallback(
    (afterSceneId: string, existing: Transition | null) => (data: { startTime?: string; endTime?: string; title: string; notes?: string }) => {
      if (existing) {
        updateTransition(existing.id, data);
      } else {
        addTransition({
          shootDayId: id,
          afterSceneId,
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
        });
      }
    },
    [id, addTransition, updateTransition]
  );

  const beginEditMode = useCallback(() => {
    setIsEditMode(true);
    setSelectedSceneIds(new Set());
    const drafts: Record<string, string> = {};
    dayScenes.forEach((s) => {
      drafts[s.id] = s.name ?? "";
    });
    setDraftNames(drafts);
  }, [dayScenes]);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSelectedSceneIds(new Set());
    setDraftNames({});
  }, []);

  const toggleSceneSelected = useCallback((sceneId: string) => {
    setSelectedSceneIds((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  }, []);

  const handleDeleteSelectedScenes = useCallback(async () => {
    if (selectedSceneIds.size === 0) {
      window.alert("לא נבחרו סצינות");
      return;
    }
    const confirmed = window.confirm(
      "למחוק את הסצינות שנבחרו? פעולה זו תמחק גם פריטים ותלויות של הסצינות."
    );
    if (!confirmed) return;

    // Delete selected scenes (cascades items + transitions via store/deleteScene)
    for (const sceneId of Array.from(selectedSceneIds)) {
      // eslint-disable-next-line no-await-in-loop
      await deleteScene(sceneId);
    }

    // Renumber remaining scenes for this shoot day to 1..N without gaps
    const { scenes: scenesState } = useStore.getState();
    const remaining: Scene[] = (scenesState[id] ?? []).slice();
    remaining.sort((a, b) => {
      const aOrder = a.shootOrderNumber ?? 0;
      const bOrder = b.shootOrderNumber ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aCreated = a.createdAt ?? "";
      const bCreated = b.createdAt ?? "";
      if (aCreated < bCreated) return -1;
      if (aCreated > bCreated) return 1;
      return a.id.localeCompare(b.id);
    });
    for (let index = 0; index < remaining.length; index += 1) {
      const s = remaining[index];
      const desired = index + 1;
      if (s.shootOrderNumber !== desired) {
        // eslint-disable-next-line no-await-in-loop
        await updateScene(s.id, { shootOrderNumber: desired });
      }
    }

    setSelectedSceneIds(new Set());
    setIsEditMode(false);
  }, [deleteScene, id, selectedSceneIds, updateScene]);

  const handleSceneDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveSceneId(null);
      setTrashAnchorRect(null);

      if (over?.id === "trash") {
        const sceneId = String(active.id);
        const fromIndex = sortedScenes.findIndex((s) => s.id === sceneId);
        setPendingDeleteSceneId(sceneId);
        setPendingDeleteFromIndex(fromIndex >= 0 ? fromIndex : null);
        setIsConfirmOpen(true);
        return;
      }

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const current = sortedScenes;
      const oldIndex = current.findIndex((s) => s.id === activeId);
      const newIndex = current.findIndex((s) => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const ordered = arrayMove(current, oldIndex, newIndex);
      for (let i = 0; i < ordered.length; i += 1) {
        const desired = i + 1;
        if (ordered[i].shootOrderNumber !== desired) {
          // eslint-disable-next-line no-await-in-loop
          await updateScene(ordered[i].id, { shootOrderNumber: desired });
        }
      }
    },
    [sortedScenes, updateScene]
  );

  const confirmDeleteScene = useCallback(() => {
    const sceneId = pendingDeleteSceneId;
    const fromIndex = pendingDeleteFromIndex;
    setPendingDeleteSceneId(null);
    setPendingDeleteFromIndex(null);
    setIsConfirmOpen(false);
    if (sceneId == null) return;
    const thatScene = sortedScenes.find((s) => s.id === sceneId);
    if (!thatScene) return;
    const snapshot = {
      scene: thatScene,
      index: fromIndex ?? sortedScenes.findIndex((s) => s.id === sceneId),
      shootOrderNumber: thatScene.shootOrderNumber,
    };
    setLastDeletedScene(snapshot);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SCENE, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
    void deleteScene(sceneId)
      .then(() => loadScenes(id))
      .then(() => {
        const { scenes: nextScenes } = useStore.getState();
        const current = (nextScenes[id] ?? []).slice();
        const sorted = current.sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
        sorted.forEach((s, i) => {
          const desired = i + 1;
          if (s.shootOrderNumber !== desired) {
            void updateScene(s.id, { shootOrderNumber: desired });
          }
        });
      });
  }, [pendingDeleteSceneId, pendingDeleteFromIndex, sortedScenes, id, deleteScene, loadScenes, updateScene]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (shootDayNotFound || (shootDay === null && id)) {
    const loading = !shootDay && !shootDayNotFound;
    if (loading) {
      return (
        <main className="min-h-screen flex items-center justify-center p-8">
          <p className="text-gray-500">טוען...</p>
        </main>
      );
    }
    return (
      <main className="min-h-screen p-6">
        <p className="text-gray-500">יום צילום לא נמצא.</p>
        <Link href="/" className="text-blue-600 underline mt-2 inline-block">
          חזרה לרשימה
        </Link>
      </main>
    );
  }

  if (!shootDay) return null;
  const effectiveTitle = title.trim() || "יום צילום";

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto bg-app text-app">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={projectId ? `/project/${projectId}` : "/"}
            className="text-app opacity-70 text-sm hover:underline"
          >
            ← {project?.name ?? "פרויקט"}
          </Link>
          <div className="mt-2 space-y-3">
            <label className="block">
              <span className="text-xs text-gray-600">שם יום צילום</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-lg font-semibold"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="block">
                <span className="text-xs text-gray-600">תאריך</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-sm"
                />
              </label>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportWhatsApp}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          {copySuccess ? "הטקסט הועתק. הדבק בוואטסאפ." : "ייצוא סטטוס לוואטסאפ"}
        </button>
        <button
          type="button"
          disabled={pdfExportLoading}
          onClick={handleExportPdf}
          className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {pdfExportLoading ? "מייצא..." : "ייצא דוח יום צילום"}
        </button>
      </header>

      <section className="mb-4">
        <label className="block">
          <span className="text-xs text-gray-600">הערות כלליות</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
          />
        </label>
      </section>

      <section className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">סצנות היום</h2>
          {!isEditMode ? (
            <button
              type="button"
              onClick={beginEditMode}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              עריכה
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleDeleteSelectedScenes}
                className="px-2 py-1 rounded border border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                מחק
              </button>
              <button
                type="button"
                onClick={exitEditMode}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                סיום
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddScene}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            + סצנה
          </button>
          <button
            type="button"
            disabled={!lastDeletedScene}
            onClick={() => {
              if (!lastDeletedScene) return;
              const snapshot = lastDeletedScene;
              void restoreScene(snapshot.scene)
                .then(() => loadScenes(id))
                .then(() => {
                  const { scenes: nextScenes } = useStore.getState();
                  const current = nextScenes[id] ?? [];
                  const sorted = [...current].sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
                  sorted.forEach((s, i) => {
                    const desired = i + 1;
                    if (s.shootOrderNumber !== desired) {
                      void updateScene(s.id, { shootOrderNumber: desired });
                    }
                  });
                  setLastDeletedScene(null);
                  localStorage.removeItem(LOCAL_STORAGE_KEY_SCENE);
                });
            }}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            שיחזור הסצנה האחרונה שנמחקה
          </button>
        </div>
      </section>

      {sortedScenes.length === 0 ? (
        <p className="text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg p-4 text-center">
          אין סצנות ליום זה. הוסף סצנה חדשה למעלה.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionTrashFirst}
          onDragStart={(event: DragStartEvent) => {
            setActiveSceneId(event.active.id as string);
            if (typeof document !== "undefined") {
              const rowEl = document.querySelector(
                `[data-scene-row-id="${event.active.id}"]`
              );
              const colEl = document.querySelector("[data-scenes-column]");
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
          onDragEnd={handleSceneDragEnd}
          onDragCancel={() => {
            setActiveSceneId(null);
            setTrashAnchorRect(null);
          }}
        >
          <div className="relative" data-scenes-column>
            <SortableContext
              items={sortedScenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
              {sortedScenes.map((scene) => {
                const sceneTime = formatSceneTimeRange(scene);
                const transitionAfter = getTransitionAfter(scene.id);
                const sceneItems: ItemRecord[] = dayItems.filter(
                  (it) => it.sceneId === scene.id
                );
                const locationItems = sceneItems.filter(
                  (it) => it.sectionType === SectionType.LOCATIONS
                );
                const talentItems = sceneItems.filter(
                  (it) => it.sectionType === SectionType.TALENT
                );
                const locSummary = summarizeTitles(locationItems);
                const talentSummary = summarizeTitles(talentItems);
                const draftName = draftNames[scene.id] ?? scene.name ?? "";
                return (
                  <SortableSceneItem
                    key={scene.id}
                    scene={scene}
                    sceneTime={sceneTime}
                    locSummary={locSummary}
                    talentSummary={talentSummary}
                    transitionAfter={transitionAfter}
                    draftName={draftName}
                    isEditMode={isEditMode}
                    isSelected={selectedSceneIds.has(scene.id)}
                    toggleSceneSelected={toggleSceneSelected}
                    setDraftNames={setDraftNames}
                    draftNames={draftNames}
                    updateScene={updateScene}
                    setTransitionEditor={setTransitionEditor}
                    deleteTransition={deleteTransition}
                    shootDayId={shootDay.id}
                    onNavigate={() =>
                      router.push(
                        `/shoot-day/${shootDay.id}/scene/${scene.id}`
                      )
                    }
                  />
                );
              })}
            </ul>
          </SortableContext>
          </div>
          {typeof document !== "undefined" &&
            createPortal(
              <TrashDropZone
                visible={!!activeSceneId}
                anchor={trashAnchorRect}
              />,
              document.body
            )}
          <DragOverlay>
            {activeSceneId &&
              (() => {
                const scene = sortedScenes.find(
                  (s) => s.id === activeSceneId
                );
                if (!scene) return null;
                const sceneTime = formatSceneTimeRange(scene);
                const sceneItems: ItemRecord[] = dayItems.filter(
                  (it) => it.sceneId === scene.id
                );
                const locationItems = sceneItems.filter(
                  (it) => it.sectionType === SectionType.LOCATIONS
                );
                const talentItems = sceneItems.filter(
                  (it) => it.sectionType === SectionType.TALENT
                );
                const locSummary = summarizeTitles(locationItems);
                const talentSummary = summarizeTitles(talentItems);
                const transitionAfter = getTransitionAfter(scene.id);
                const draftName =
                  draftNames[scene.id] ?? scene.name ?? "";
                return (
                  <SceneOverlayCard
                    scene={scene}
                    sceneTime={sceneTime}
                    locSummary={locSummary}
                    talentSummary={talentSummary}
                    transitionAfter={transitionAfter}
                    draftName={draftName}
                    isEditMode={isEditMode}
                  />
                );
              })()}
          </DragOverlay>
        </DndContext>
      )}

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-scene-title"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-5 border border-gray-200 dark:border-gray-700"
            dir="rtl"
          >
            <h2
              id="confirm-delete-scene-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              האם למחוק את הסצנה?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              פעולה זו תמחק את הסצנה.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteSceneId(null);
                  setPendingDeleteFromIndex(null);
                  setIsConfirmOpen(false);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                לא
              </button>
              <button
                type="button"
                onClick={confirmDeleteScene}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                כן, למחוק
              </button>
            </div>
          </div>
        </div>
      )}
      {transitionEditor && (
        <TransitionEditor
          shootDayId={id}
          afterSceneId={transitionEditor.afterSceneId}
          existing={transitionEditor.existing}
          onSave={handleSaveTransition(transitionEditor.afterSceneId, transitionEditor.existing)}
          onDelete={deleteTransition}
          onClose={() => setTransitionEditor(null)}
        />
      )}
    </main>
  );
}

interface SortableSceneItemProps {
  scene: Scene;
  sceneTime: string;
  locSummary: string;
  talentSummary: string;
  transitionAfter: Transition | undefined;
  draftName: string;
  isEditMode: boolean;
  isSelected: boolean;
  toggleSceneSelected: (sceneId: string) => void;
  setDraftNames: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  draftNames: Record<string, string>;
  updateScene: (id: string, patch: Partial<Scene>) => Promise<void>;
  setTransitionEditor: React.Dispatch<
    React.SetStateAction<
      { afterSceneId: string; existing: Transition | null } | null
    >
  >;
  deleteTransition: (id: string) => Promise<void>;
  shootDayId: string;
  onNavigate: () => void;
}

function SortableSceneItem({
  scene,
  sceneTime,
  locSummary,
  talentSummary,
  transitionAfter,
  draftName,
  isEditMode,
  isSelected,
  toggleSceneSelected,
  setDraftNames,
  draftNames,
  updateScene,
  setTransitionEditor,
  deleteTransition,
  onNavigate,
}: SortableSceneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="space-y-1" data-scene-row-id={scene.id}>
      <div className="flex items-start gap-2">
        {isEditMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleSceneSelected(scene.id);
            }}
            className="mt-2 h-4 w-4 rounded-full border border-gray-400 text-gray-700 accent-gray-700"
          />
        )}
        <span
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none"
        >
          ⋮⋮
        </span>
        <div
          className="flex-shrink-0 mt-1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ColorTagPicker
            value={scene.colorTag ?? null}
            onChange={(tag) => void updateScene(scene.id, { colorTag: tag ?? undefined })}
          />
        </div>
        <button
          type="button"
          onClick={(e) => {
            if (isEditMode) {
              e.preventDefault();
              return;
            }
            onNavigate();
          }}
          className="w-full text-right flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 surface-app border border-app rounded-lg hover:opacity-95 hover:shadow-sm transition"
          style={cardStyleForColorTag(scene.colorTag)}
        >
          <div className="space-y-1">
            <div className="font-semibold">
              סצנה {scene.shootOrderNumber}
              {isEditMode ? (
                <input
                  type="text"
                  value={draftName}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setDraftNames((prev) => ({
                      ...prev,
                      [scene.id]: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    const raw = (
                      draftNames[scene.id] ?? scene.name ?? ""
                    ).trim();
                    const safe = raw || "ללא שם";
                    setDraftNames((prev) => ({
                      ...prev,
                      [scene.id]: safe,
                    }));
                    void updateScene(scene.id, { name: safe });
                  }}
                  className="mr-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-gray-800"
                />
              ) : (
                scene.name && (
                  <span className="text-gray-700 dark:text-gray-200">
                    {" "}
                    — {scene.name}
                  </span>
                )
              )}
            </div>
            {sceneTime && (
              <div className="text-xs text-gray-600">{sceneTime}</div>
            )}
            {locSummary && (
              <div className="text-xs text-gray-600">
                לוקיישן: {locSummary}
              </div>
            )}
            {talentSummary && (
              <div className="text-xs text-gray-600">
                שחקנים: {talentSummary}
              </div>
            )}
            {scene.scriptSceneNumber && (
              <div className="text-xs text-gray-500">
                סצנת תסריט: {scene.scriptSceneNumber}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={
                scene.status === "OK"
                  ? "status-ok"
                  : scene.status === "MISSING"
                  ? "status-missing"
                  : "status-blocked"
              }
            >
              {scene.status === "OK"
                ? "תקין"
                : scene.status === "MISSING"
                ? "חסר"
                : "חסום"}
            </span>
            <span className="text-blue-600 text-xs">לפרטים →</span>
          </div>
        </button>
      </div>
      <div className="mr-4 flex items-center gap-2 flex-wrap">
        {transitionAfter ? (
          <>
            <span className="text-xs text-gray-600 dark:text-gray-400 py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded">
              {transitionAfter.title}{" "}
              {formatTransitionTimeRange(transitionAfter) && (
                <span className="font-mono">
                  {formatTransitionTimeRange(transitionAfter)}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTransitionEditor({
                  afterSceneId: scene.id,
                  existing: transitionAfter,
                });
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              ערוך
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("למחוק מעבר לוקיישן זה?")) {
                  void deleteTransition(transitionAfter.id);
                }
              }}
              className="text-xs text-red-500 hover:underline"
            >
              מחק
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTransitionEditor({
                afterSceneId: scene.id,
                existing: null,
              });
            }}
            className="text-xs px-2 py-1 border border-dashed border-gray-400 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            + מעבר לוקיישן
          </button>
        )}
      </div>
    </li>
  );
}

interface SceneOverlayCardProps {
  scene: Scene;
  sceneTime: string;
  locSummary: string;
  talentSummary: string;
  transitionAfter: Transition | undefined;
  draftName: string;
  isEditMode: boolean;
}

function SceneOverlayCard({
  scene,
  sceneTime,
  locSummary,
  talentSummary,
  transitionAfter,
  draftName,
  isEditMode,
}: SceneOverlayCardProps) {
  return (
    <div className="space-y-1 p-3 surface-app border border-app rounded-lg shadow-lg scale-[1.02]">
      <div className="flex items-start gap-2">
        {isEditMode && (
          <input
            type="checkbox"
            checked={false}
            readOnly
            className="mt-2 h-4 w-4 rounded-full border border-gray-400 text-gray-700 accent-gray-700"
          />
        )}
        <span className="mt-2 cursor-grab text-gray-400 select-none">⋮⋮</span>
        <div className="w-full text-right flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 surface-app border border-app rounded-lg">
          <div className="space-y-1">
            <div className="font-semibold">
              סצנה {scene.shootOrderNumber}
              <span className="text-gray-700 dark:text-gray-200">
                {" "}
                — {draftName || scene.name}
              </span>
            </div>
            {sceneTime && (
              <div className="text-xs text-gray-600">{sceneTime}</div>
            )}
            {locSummary && (
              <div className="text-xs text-gray-600">
                לוקיישן: {locSummary}
              </div>
            )}
            {talentSummary && (
              <div className="text-xs text-gray-600">
                שחקנים: {talentSummary}
              </div>
            )}
            {scene.scriptSceneNumber && (
              <div className="text-xs text-gray-500">
                סצנת תסריט: {scene.scriptSceneNumber}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={
                scene.status === "OK"
                  ? "status-ok"
                  : scene.status === "MISSING"
                  ? "status-missing"
                  : "status-blocked"
              }
            >
              {scene.status === "OK"
                ? "תקין"
                : scene.status === "MISSING"
                ? "חסר"
                : "חסום"}
            </span>
            <span className="text-blue-600 text-xs">לפרטים →</span>
          </div>
        </div>
      </div>
      <div className="mr-4 flex items-center gap-2 flex-wrap">
        {transitionAfter ? (
          <span className="text-xs text-gray-600 dark:text-gray-400 py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded">
            {transitionAfter.title}{" "}
            {formatTransitionTimeRange(transitionAfter) && (
              <span className="font-mono">
                {formatTransitionTimeRange(transitionAfter)}
              </span>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}
