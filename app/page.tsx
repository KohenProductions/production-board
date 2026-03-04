"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import {
  DndContext,
  DragOverlay,
  useDndMonitor,
  useDndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  PointerSensor,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project } from "@/types";
import { TrashDropZone, TRASH_GAP, TRASH_WIDTH } from "@/components/TrashDropZone";
import { ColorTagPicker, cardStyleForColorTag } from "@/components/ColorTagPicker";

const LOCAL_STORAGE_KEY = "lastDeletedProjectSnapshot";

export interface DeletedProjectSnapshot {
  project: Project;
  index: number;
  projectOrderIndex: number | null;
}

const SUCK_DURATION_MS = 220;

/** Prefer pointer, then rect overlap (so trash highlights on card overlap); else closestCenter for stable reorder. */
function createCollisionDetectionProjects(trashVisible: boolean): CollisionDetection {
  return (args) => {
    if (!trashVisible) return closestCenter(args);
    const byPointer = pointerWithin(args);
    if (byPointer.length > 0) return byPointer;
    const byRect = rectIntersection(args);
    if (byRect.length > 0) return byRect;
    return closestCenter(args);
  };
}

const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));

function rectCenter(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function playPoof() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "triangle";
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.08);

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.13);

    o.onended = () => ctx.close();
  } catch {
    // ignore if blocked
  }
}

export default function HomePage() {
  const { hydrated, projects, loadProjects } = useStore();
  const [lastDeleted, setLastDeleted] = useState<DeletedProjectSnapshot | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("lastDeletedProjectSnapshot");
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DeletedProjectSnapshot;
        return parsed?.project ? parsed : null;
      } catch {
        return null;
      }
    }
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    if (hydrated) loadProjects();
  }, [hydrated, loadProjects]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-app text-app">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-app">לוח הפקה</h1>
          <p className="text-app opacity-80 mt-1">בחר פרויקט או צור חדש</p>
        </header>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <CreateProjectForm />
          <button
          type="button"
          disabled={!lastDeleted}
          onClick={() => {
            if (!lastDeleted) return;
            void (async () => {
              const snapshot = lastDeleted;
              if (!snapshot?.project) return;
              const { restoreProject, loadProjects, updateProject } =
                useStore.getState();
              await restoreProject(snapshot.project);
              await loadProjects();
              const projects = useStore.getState().projects;
              const sorted = [...projects].sort(
                (a, b) =>
                  (a.projectOrderIndex ?? 999999) -
                  (b.projectOrderIndex ?? 999999)
              );
              for (let i = 0; i < sorted.length; i += 1) {
                const desired = i + 1;
                const p = sorted[i] as Project & { projectOrderIndex?: number };
                if (p.projectOrderIndex !== desired) {
                  await updateProject(p.id, { projectOrderIndex: desired });
                }
              }
              setLastDeleted(null);
              localStorage.removeItem("lastDeletedProjectSnapshot");
            })();
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors"
        >
          שיחזור הפרויקט האחרון
        </button>
        </div>
        {projects.length === 0 ? (
        <ul className="space-y-2">
          <li className="text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-lg">
            אין פרויקטים. צור פרויקט ראשון למעלה.
          </li>
        </ul>
      ) : (
        <ProjectsDndWrapper
          sensors={sensors}
          setLastDeleted={setLastDeleted}
        />
        )}
      </div>
    </main>
  );
}

function ProjectsDndWrapper({
  sensors,
  setLastDeleted,
}: {
  sensors: React.ComponentProps<typeof DndContext>["sensors"];
  setLastDeleted: (snapshot: DeletedProjectSnapshot | null) => void;
}) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const collisionDetectionProjects = React.useMemo(
    () => createCollisionDetectionProjects(!!activeProjectId),
    [activeProjectId]
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionProjects}
    >
      <ProjectsDndContent
        setLastDeleted={setLastDeleted}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
      />
    </DndContext>
  );
}

function ProjectsDndContent({
  setLastDeleted,
  activeProjectId,
  setActiveProjectId,
}: {
  setLastDeleted: (snapshot: DeletedProjectSnapshot | null) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}) {
  const { droppableRects } = useDndContext();
  const { projects, loadProjects, updateProject, deleteProject } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  /** Fixed position for trash: captured once on drag start from real row + column rect. */
  const [trashAnchorRect, setTrashAnchorRect] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [magnet, setMagnet] = useState({
    pullX: 0,
    pullY: 0,
    scale: 1,
    rotate: 0,
    strength: 0,
  });
  const [deleteAnim, setDeleteAnim] = useState<null | {
    id: string;
    project: Project;
    toX: number;
    toY: number;
    run: boolean;
  }>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteFromIndex, setPendingDeleteFromIndex] = useState<
    number | null
  >(null);
  const [pendingDeleteTrashCenter, setPendingDeleteTrashCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  /** "Suck into trash" clone shown after user confirms delete; then we delete. */
  const [suckAnim, setSuckAnim] = useState<null | {
    project: Project;
    toX: number;
    toY: number;
    run: boolean;
  }>(null);
  const [showDeletedToast, setShowDeletedToast] = useState(false);

  const performDelete = React.useCallback(
    (id: string, snapshot: DeletedProjectSnapshot) => {
      setLastDeleted(snapshot);
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            project: snapshot.project,
            index: snapshot.index,
            projectOrderIndex: snapshot.projectOrderIndex,
          })
        );
      } catch {
        // ignore
      }
      void deleteProject(id).then(() => loadProjects());
    },
    [setLastDeleted, deleteProject, loadProjects]
  );

  const confirmDelete = React.useCallback(() => {
    const id = pendingDeleteId;
    const fromIndex = pendingDeleteFromIndex;
    const trashCenter = pendingDeleteTrashCenter;
    setPendingDeleteId(null);
    setPendingDeleteFromIndex(null);
    setPendingDeleteTrashCenter(null);
    setIsConfirmOpen(false);

    if (id == null) return;

    const thatProject = projects.find((p) => String(p.id) === String(id));
    if (!thatProject) return;

    const snapshot: DeletedProjectSnapshot = {
      project: thatProject,
      index:
        fromIndex ??
        projects.findIndex((p) => String(p.id) === String(id)),
      projectOrderIndex:
        (thatProject as Project & { projectOrderIndex?: number })
          .projectOrderIndex ?? null,
    };

    if (trashCenter) {
      setSuckAnim({
        project: thatProject,
        toX: trashCenter.x,
        toY: trashCenter.y,
        run: false,
      });
      requestAnimationFrame(() => {
        setSuckAnim((prev) => (prev ? { ...prev, run: true } : null));
      });
      setTimeout(() => {
        performDelete(id, snapshot);
        setSuckAnim(null);
        setShowDeletedToast(true);
        const t = setTimeout(() => setShowDeletedToast(false), 3000);
        return () => clearTimeout(t);
      }, SUCK_DURATION_MS);
    } else {
      performDelete(id, snapshot);
      setShowDeletedToast(true);
      setTimeout(() => setShowDeletedToast(false), 3000);
    }
  }, [
    pendingDeleteId,
    pendingDeleteFromIndex,
    pendingDeleteTrashCenter,
    projects,
    performDelete,
  ]);

  useDndMonitor({
    onDragStart({ active }) {
      setActiveProjectId(String(active.id));
      setIsDragging(true);

      if (typeof document === "undefined") return;
      const rowEl = document.querySelector(
        `[data-project-row-id="${active.id}"]`
      );
      const colEl = document.querySelector("[data-projects-column]");
      if (rowEl && colEl) {
        const rowRect = rowEl.getBoundingClientRect();
        const colRect = colEl.getBoundingClientRect();
        const left = colRect.right + TRASH_GAP;
        setTrashAnchorRect({
          top: rowRect.top,
          left,
          height: rowRect.height,
        });
      } else {
        setTrashAnchorRect(null);
      }
    },

    onDragMove({ active }) {
      const ar = active.rect?.current?.translated;
      const activeRect = ar as DOMRect | undefined;
      const tr = droppableRects.get("trash");
      if (!tr || !activeRect) {
        setMagnet({
          pullX: 0,
          pullY: 0,
          scale: 1,
          rotate: 0,
          strength: 0,
        });
        return;
      }

      const trashRect = tr as DOMRect;
      const tc = rectCenter(trashRect);
      const ac = rectCenter(activeRect);

      const dx = tc.x - ac.x;
      const dy = tc.y - ac.y;
      const dist = Math.hypot(dx, dy);

      const radius = 220;
      const maxPull = 26;
      const s = clamp(1 - dist / radius, 0, 1);

      const len = dist || 1;
      const nx = dx / len;
      const ny = dy / len;

      const pullX = nx * maxPull * s;
      const pullY = ny * maxPull * s;

      const scale = 1 - 0.08 * s;
      const rotate = clamp(nx * 6 * s, -6, 6);

      setMagnet({ pullX, pullY, scale, rotate, strength: s });
    },

    onDragCancel() {
      setIsDragging(false);
      setActiveProjectId(null);
      setTrashAnchorRect(null);
      setMagnet({
        pullX: 0,
        pullY: 0,
        scale: 1,
        rotate: 0,
        strength: 0,
      });
    },

    async onDragEnd({ active, over }) {
      const activeId = String(active.id);

      setIsDragging(false);
      setTrashAnchorRect(null);
      setMagnet({
        pullX: 0,
        pullY: 0,
        scale: 1,
        rotate: 0,
        strength: 0,
      });

      // Trash: open confirm modal and bail.
      if (over?.id === "trash" && trashAnchorRect) {
        const fromIndex = projects.findIndex(
          (p) => String(p.id) === activeId
        );
        setPendingDeleteTrashCenter({
          x: trashAnchorRect.left + TRASH_WIDTH / 2,
          y: trashAnchorRect.top + trashAnchorRect.height / 2,
        });
        setPendingDeleteId(activeId);
        setPendingDeleteFromIndex(fromIndex >= 0 ? fromIndex : null);
        setIsConfirmOpen(true);
        setActiveProjectId(null);
        return;
      }

      if (!over) {
        setActiveProjectId(null);
        return;
      }

      const overId = String(over.id);

      if (activeId !== overId) {
        const oldIndex = projects.findIndex(
          (p) => String(p.id) === activeId
        );
        const newIndex = projects.findIndex(
          (p) => String(p.id) === overId
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const ordered = arrayMove(projects, oldIndex, newIndex);

          // Update local order immediately for dnd-kit.
          useStore.setState({ projects: ordered });

          // Persist projectOrderIndex = 1..N (only changed ones).
          await Promise.all(
            ordered.map((p, i) => {
              const desired = i + 1;
              return p.projectOrderIndex === desired
                ? Promise.resolve()
                : updateProject(p.id, { projectOrderIndex: desired });
            })
          );
        }
      }

      setActiveProjectId(null);
    },
  });

  const activeProject =
    activeProjectId != null
      ? projects.find((p) => String(p.id) === activeProjectId) ?? null
      : null;

  return (
    <>
      <div className="relative" data-projects-column>
        <SortableContext
          items={projects.map((p) => String(p.id))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {projects.map((p) => (
              <SortableProjectItem key={p.id} project={p} />
            ))}
          </ul>
        </SortableContext>
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <TrashDropZone
            visible={!!activeProjectId}
            anchor={trashAnchorRect}
          />,
          document.body
        )}
      <DragOverlay>
        {activeProject ? (
          <div
            style={{
              transform: `translate3d(${magnet.pullX}px, ${magnet.pullY}px, 0) rotate(${magnet.rotate}deg) scale(${magnet.scale})`,
              transition:
                deleteAnim?.id === activeProjectId
                  ? "none"
                  : "transform 90ms ease-out",
              transformOrigin: "center",
            }}
            className="will-change-transform"
          >
            <ProjectRow project={activeProject} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
      {deleteAnim ? (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div
            className="absolute transition-all duration-200 ease-in"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <div
              className="absolute will-change-transform"
              style={{
                left: deleteAnim.run ? `${deleteAnim.toX}px` : "50%",
                top: deleteAnim.run ? `${deleteAnim.toY}px` : "50%",
                transform: "translate(-50%, -50%)",
                opacity: deleteAnim.run ? 0 : 1,
                transition:
                  "left 200ms ease-in, top 200ms ease-in, opacity 200ms ease-in",
              }}
            >
              <div
                className="origin-center"
                style={{
                  transform: deleteAnim.run ? "scale(0.2)" : "scale(1)",
                  transition: "transform 200ms ease-in",
                }}
              >
                <ProjectRow project={deleteAnim.project} isOverlay />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {suckAnim ? (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div
            className="absolute will-change-transform origin-center"
            style={{
              left: suckAnim.run ? `${suckAnim.toX}px` : "50%",
              top: suckAnim.run ? `${suckAnim.toY}px` : "50%",
              transform: "translate(-50%, -50%)",
              opacity: suckAnim.run ? 0 : 1,
              transition: `left ${SUCK_DURATION_MS}ms ease-out, top ${SUCK_DURATION_MS}ms ease-out, opacity ${SUCK_DURATION_MS}ms ease-out`,
            }}
          >
            <div
              className="origin-center"
              style={{
                transform: suckAnim.run ? "scale(0.15)" : "scale(1)",
                transition: `transform ${SUCK_DURATION_MS}ms ease-out`,
              }}
            >
              <ProjectRow project={suckAnim.project} isOverlay />
            </div>
          </div>
        </div>
      ) : null}
      {showDeletedToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-gray-900 dark:bg-gray-700 text-white text-sm shadow-lg"
          role="status"
          aria-live="polite"
        >
          נמחק
        </div>
      )}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-5 border border-gray-200 dark:border-gray-700"
            dir="rtl"
          >
            <h2
              id="confirm-delete-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              האם למחוק את הפרויקט?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              פעולה זו תמחק את הפרויקט.
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
                onClick={confirmDelete}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                כן, למחוק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SortableProjectItem({ project }: { project: Project }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(project.id) });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-project-row-id={String(project.id)}
    >
      <ProjectRow project={project} handleProps={{ ...attributes, ...listeners }} />
    </li>
  );
}

function ProjectRow({
  project,
  handleProps,
  isOverlay,
}: {
  project: Project;
  handleProps?: React.HTMLAttributes<HTMLSpanElement>;
  isOverlay?: boolean;
}) {
  const updateProject = useStore((s) => s.updateProject);
  const cardStyle = cardStyleForColorTag(project.colorTag);

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
          value={project.colorTag ?? null}
          onChange={(tag) => void updateProject(project.id, { colorTag: tag ?? undefined })}
        />
      </div>
      <div>
        <span className="font-medium">{project.name}</span>
        {project.clientName && (
          <span className="text-gray-500 mr-2"> · {project.clientName}</span>
        )}
      </div>
    </div>
  );

  const cardClassName = "p-4 surface-app border border-app rounded-lg";
  if (isOverlay) {
    return (
      <div
        className={`${cardClassName} shadow-lg scale-[1.02]`}
        style={{ ...cardStyle, borderLeftWidth: cardStyle.borderLeftWidth ?? 0 }}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/project/${project.id}`}
        className={`block ${cardClassName} hover:opacity-95 hover:shadow-sm transition`}
      style={cardStyle}
    >
      {content}
    </Link>
  );
}
