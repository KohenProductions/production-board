"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionPanel } from "@/components/SectionPanel";
import { ItemDetailDrawer } from "@/components/ItemDetailDrawer";
import { copyTextToClipboard } from "@/lib/clipboard";
import { buildSceneWhatsAppSummary } from "@/lib/whatsapp-export";
import { DEFAULT_DETAILS, SectionType, type ItemRecord, type Scene } from "@/types";
import * as db from "@/lib/db";

function parseSceneDescription(detailsJson: string | undefined | null): string {
  if (detailsJson == null || typeof detailsJson !== "string") return "";
  try {
    const d = JSON.parse(detailsJson) as { description?: string };
    return typeof d?.description === "string" ? d.description : "";
  } catch {
    return "";
  }
}

function findLegacySceneDescription(scene: Scene, items: ItemRecord[]): string {
  const fromSceneJson = parseSceneDescription(scene?.detailsJson);
  if (fromSceneJson?.trim()) return fromSceneJson.trim();
  for (const item of items) {
    try {
      const raw = item?.detailsJson;
      const parsed = JSON.parse(raw != null && typeof raw === "string" ? raw : "{}") as {
        description?: string;
        richText?: string;
      };
      if (
        item.sectionType === SectionType.SCENES &&
        parsed.description &&
        parsed.description.trim()
      ) {
        return parsed.description.trim();
      }
      if (
        item.sectionType === SectionType.NOTES &&
        parsed.richText &&
        parsed.richText.trim()
      ) {
        return parsed.richText.trim();
      }
    } catch {
      // ignore malformed legacy details
    }
  }
  return "";
}

export default function ScenePage() {
  const params = useParams();
  const shootDayId = params.id as string;
  const sceneId = params.sceneId as string;

  const {
    hydrated,
    projects,
    items,
    loadProjects,
    loadItems,
    updateScene,
    getShootDay,
  } = useStore();

  const [scene, setScene] = useState<Scene | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [shootDayTitle, setShootDayTitle] = useState<string>("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    loadProjects();
  }, [hydrated, loadProjects]);

  useEffect(() => {
    if (!hydrated || !shootDayId || !sceneId) return;
    (async () => {
      const [day, sc] = await Promise.all([
        getShootDay(shootDayId),
        db.getScene(sceneId),
      ]);
      if (!day || !sc) {
        setNotFound(true);
        return;
      }
      if (sc.shootDayId !== shootDayId) {
        setNotFound(true);
        return;
      }
      setScene(sc);
      setShootDayTitle(day.title);
      setProjectId(day.projectId);
      setNotFound(false);
      await loadItems(shootDayId);
    })();
  }, [hydrated, shootDayId, sceneId, getShootDay, loadItems]);

  const dayItems = items[shootDayId] ?? [];
  const sceneItems: ItemRecord[] = scene
    ? dayItems.filter((it) => it.sceneId === scene.id)
    : [];

  // Keep draft description in sync when scene.description changes and we're not editing
  useEffect(() => {
    if (!scene || isEditingDesc) return;
    setDraftDesc(scene.description ?? "");
  }, [scene, scene?.description, isEditingDesc]);

  const handleFieldChange = useCallback(
    (patch: Partial<Scene>) => {
      if (!scene) return;
      setScene((prev) => (prev ? { ...prev, ...patch } : null));
      updateScene(scene.id, patch);
    },
    [scene, updateScene]
  );

  // One-time migration from legacy description sources into scene.description
  useEffect(() => {
    if (!scene || !scene.id) return;
    if (scene.description != null && String(scene.description).trim()) return;
    const itemsList = Array.isArray(sceneItems) ? sceneItems : [];
    const legacy = findLegacySceneDescription(scene, itemsList);
    if (legacy && legacy.trim()) {
      handleFieldChange({ description: legacy });
    }
  }, [scene, sceneItems, handleFieldChange]);

  const handleAddItem = useCallback(
    async (sectionType: SectionType) => {
      if (!scene) return;
      const newId = crypto.randomUUID();
      const { addItem } = useStore.getState();
      const details = DEFAULT_DETAILS[sectionType];
      await addItem(
        {
          id: newId,
          shootDayId,
          sceneId: scene.id,
          sectionType,
          title: "פריט חדש",
          status: "OK",
          tags: [],
        },
        details
      );
      setOpenItemId(newId);
    },
    [shootDayId, scene]
  );

  const handleTimeChange = useCallback(
    (field: "startTime" | "endTime", value: string) => {
      if (!scene) return;
      const next = { ...scene, [field]: value || undefined };
      setScene((prev) => (prev ? { ...prev, [field]: value || undefined } : null));
      if (next.startTime && next.endTime && next.endTime < next.startTime) return;
      updateScene(scene.id, { [field]: value || undefined });
    },
    [scene, updateScene]
  );

  const handleExportScene = useCallback(async () => {
    if (!scene) return;
    const text = buildSceneWhatsAppSummary(scene, sceneItems);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  }, [scene, sceneItems]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (notFound || !scene) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <p className="text-gray-500">הסצנה לא נמצאה.</p>
        <Link
          href={`/shoot-day/${shootDayId}`}
          className="text-blue-600 underline mt-2 inline-block"
        >
          חזרה ליום צילום
        </Link>
      </main>
    );
  }

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto" dir="rtl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/shoot-day/${shootDayId}`}
            className="text-gray-500 text-sm hover:underline"
          >
            חזרה ליום צילום
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            סצנה {scene.shootOrderNumber}
            {scene.name ? ` — ${scene.name}` : ""}
          </h1>
          {scene.scriptSceneNumber && (
            <p className="text-sm text-gray-600 mt-0.5">
              סצנת תסריט: {scene.scriptSceneNumber}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleExportScene}
          className="shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          {copySuccess ? "הטקסט הועתק. הדבק בוואטסאפ." : "ייצוא סטטוס לסצנה"}
        </button>
      </header>

      <section
        className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200"
        aria-label="תיאור סצנה"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            תיאור סצנה
          </h3>
          {isEditingDesc ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  handleFieldChange({ description: draftDesc });
                  setIsEditingDesc(false);
                }}
                className="px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
              >
                סיום
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftDesc(scene.description ?? "");
                  setIsEditingDesc(false);
                }}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingDesc(true)}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              עריכה
            </button>
          )}
        </div>
        {isEditingDesc ? (
          <textarea
            dir="rtl"
            placeholder="כתוב כאן תיאור קצר לסצנה..."
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 whitespace-pre-wrap"
          />
        ) : scene.description && scene.description.trim() ? (
          <p className="whitespace-pre-wrap">{scene.description}</p>
        ) : (
          <p className="text-xs text-gray-400">
            אין תיאור לסצנה. לחץ עריכה כדי להוסיף.
          </p>
        )}
      </section>

      <section className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" aria-label="זמנים">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">זמנים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">שעת התחלה</span>
            <input
              type="time"
              value={scene.startTime ?? ""}
              onChange={(e) => handleTimeChange("startTime", e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">שעת סיום</span>
            <input
              type="time"
              value={scene.endTime ?? ""}
              onChange={(e) => handleTimeChange("endTime", e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </label>
        </div>
        {scene.startTime && scene.endTime && scene.endTime < scene.startTime && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">שעת סיום חייבת להיות אחרי שעת התחלה.</p>
        )}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm text-gray-600">שם סצנה</span>
          <input
            type="text"
            value={scene.name ?? ""}
            onChange={(e) => handleFieldChange({ name: e.target.value })}
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">מספר סצנה בתסריט</span>
          <input
            type="text"
            value={scene.scriptSceneNumber ?? ""}
            onChange={(e) =>
              handleFieldChange({ scriptSceneNumber: e.target.value || undefined })
            }
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">סטטוס</span>
          <select
            value={scene.status ?? "OK"}
            onChange={(e) =>
              handleFieldChange({ status: e.target.value as Scene["status"] })
            }
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
          >
            <option value="OK">✅ OK</option>
            <option value="MISSING">❌ חסר</option>
            <option value="BLOCKED">⛔ חסום</option>
          </select>
        </label>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          SectionType.LOCATIONS,
          SectionType.TALENT,
          SectionType.SCHEDULE,
          SectionType.ASSETS,
          SectionType.NOTES,
          SectionType.CONTACTS,
        ].map((sectionType) => (
          <SectionPanel
            key={sectionType}
            sectionType={sectionType}
            items={sceneItems}
            onAdd={handleAddItem}
            onOpenItem={(item: ItemRecord) => setOpenItemId(item.id)}
          />
        ))}
      </section>

      {openItemId && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setOpenItemId(null)}
            aria-hidden
          />
          <ItemDetailDrawer
            itemId={openItemId}
            onClose={() => setOpenItemId(null)}
          />
        </>
      )}
    </main>
  );
}
