"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SceneEntitySection } from "@/components/SceneEntitySection";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
  shootDay: {
    id: string;
    title: string;
    projectId: string;
    project: {
      id: string;
      name: string;
    };
  };
};

type SceneDraft = {
  name: string;
  scriptSceneNumber: string;
  status: "OK" | "MISSING" | "BLOCKED";
  description: string;
  startTime: string;
  endTime: string;
};

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

function buildDraft(scene: ApiScene): SceneDraft {
  return {
    name: scene.name ?? "",
    scriptSceneNumber: scene.scriptSceneNumber ?? "",
    status: scene.status,
    description: scene.description ?? "",
    startTime: scene.startTime ?? "",
    endTime: scene.endTime ?? "",
  };
}

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();

  const shootDayId = params.id as string;
  const sceneId = params.sceneId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [scene, setScene] = useState<ApiScene | null>(null);
  const [draft, setDraft] = useState<SceneDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const loadScene = useCallback(async () => {
    if (!sceneId) return;

    setLoading(true);
    setError(null);
    setScene(null);
    setDraft(null);

    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to load scene (${res.status})`);
      }

      const json = (await res.json()) as { scene: ApiScene };
      const nextScene = json.scene ?? null;

      if (!nextScene) {
        throw new Error("Scene payload is missing");
      }

      if (shootDayId && nextScene.shootDayId !== shootDayId) {
        throw new Error("Scene does not belong to this shoot day");
      }

      setScene(nextScene);
      setDraft(buildDraft(nextScene));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sceneId, shootDayId]);

  useEffect(() => {
    void loadScene();
  }, [loadScene]);

  const backHref = useMemo(() => {
    if (scene?.shootDayId) return `/shoot-day/${scene.shootDayId}`;
    if (shootDayId) return `/shoot-day/${shootDayId}`;
    return "/";
  }, [scene?.shootDayId, shootDayId]);

  const hasChanges = useMemo(() => {
    if (!scene || !draft) return false;

    return (
      draft.name !== (scene.name ?? "") ||
      draft.scriptSceneNumber !== (scene.scriptSceneNumber ?? "") ||
      draft.status !== scene.status ||
      draft.description !== (scene.description ?? "") ||
      draft.startTime !== (scene.startTime ?? "") ||
      draft.endTime !== (scene.endTime ?? "")
    );
  }, [scene, draft]);

  const saveChanges = useCallback(async () => {
    if (!sceneId || !draft) return false;

    const name = draft.name.trim();
    if (!name) {
      window.alert("שם סצנה הוא שדה חובה.");
      return false;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          scriptSceneNumber: draft.scriptSceneNumber.trim() || null,
          status: draft.status,
          description: draft.description.trim() || null,
          startTime: draft.startTime.trim() || null,
          endTime: draft.endTime.trim() || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to update scene (${res.status})`);
      }

      const json = (await res.json()) as { scene: ApiScene };
      const updatedScene = json.scene ?? null;

      if (!updatedScene) {
        throw new Error("Scene payload is missing");
      }

      setScene(updatedScene);
      setDraft(buildDraft(updatedScene));
      return true;
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }, [sceneId, draft]);

  const saveAndExit = useCallback(async () => {
    const ok = await saveChanges();
    if (ok) {
      router.push(backHref);
    }
  }, [saveChanges, router, backHref]);

  const duplicateScene = useCallback(async () => {
    if (!sceneId) return;

    const confirmed = window.confirm(
      "לשכפל את הסצנה הנוכחית יחד עם כל הפריטים המשויכים אליה?"
    );

    if (!confirmed) return;

    setDuplicating(true);

    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to duplicate scene (${res.status})`);
      }

      router.push(backHref);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setDuplicating(false);
    }
  }, [sceneId, router, backHref]);

  const handleBackClick = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();

      if (!hasChanges) {
        router.push(backHref);
        return;
      }

      setShowUnsavedDialog(true);
    },
    [hasChanges, router, backHref]
  );

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto">
        <Link href={backHref} className="text-blue-600 underline text-sm">
          ← חזרה
        </Link>

        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}
        </div>

        <button
          type="button"
          onClick={loadScene}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          נסה שוב
        </button>
      </main>
    );
  }

  if (!scene || !draft) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto">
        <Link href={backHref} className="text-blue-600 underline text-sm">
          ← חזרה
        </Link>
        <p className="mt-4 text-gray-500">הסצנה לא נמצאה.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto bg-app text-app">
     <Breadcrumbs
  items={[
    { label: "לוח הפקה", href: "/" },
    {
      label: scene.shootDay?.project?.name ?? "פרויקט",
      href: `/project/${scene.shootDay?.projectId}`,
    },
    {
      label: scene.shootDay?.title ?? "יום צילום",
      href: `/shoot-day/${scene.shootDayId}`,
    },
    {
      label: scene.name?.trim() || `סצנה ${scene.shootOrderNumber}`,
    },
  ]}
/>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              type="button"
              onClick={handleBackClick}
              className="text-app opacity-70 text-sm hover:underline"
            >
              ← {scene.shootDay?.title ?? "יום צילום"}
            </button>

            <h1 className="text-2xl font-bold mt-2">
              סצנה {scene.shootOrderNumber}
              {draft.name ? ` — ${draft.name}` : ""}
            </h1>

            {scene.shootDay?.project?.name ? (
              <div className="mt-2 text-sm text-gray-500">{scene.shootDay.project.name}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void duplicateScene()}
              disabled={duplicating || saving}
              className="px-4 py-2 rounded-lg border border-app hover:opacity-90 disabled:opacity-50"
            >
              {duplicating ? "משכפל..." : "שכפל סצנה"}
            </button>

            <button
              type="button"
              onClick={handleBackClick}
              disabled={saving || duplicating}
              className="px-4 py-2 rounded-lg border border-app hover:opacity-90 disabled:opacity-50"
            >
              ביטול
            </button>

            <button
              type="button"
              onClick={saveAndExit}
              disabled={saving || duplicating || !hasChanges}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "שומר..." : "אישור שינויים"}
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <label className="block">
          <span className="text-sm text-gray-600">שם סצנה</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">מספר סצנה בתסריט</span>
          <input
            type="text"
            value={draft.scriptSceneNumber}
            onChange={(e) =>
              setDraft((prev) =>
                prev ? { ...prev, scriptSceneNumber: e.target.value } : prev
              )
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">סטטוס</span>
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      status: e.target.value as ApiScene["status"],
                    }
                  : prev
              )
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
          >
            <option value="OK">תקין</option>
            <option value="MISSING">חסר</option>
            <option value="BLOCKED">חסום</option>
          </select>
        </label>
      </section>

      <section className="mb-6">
        <div className="inline-flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusClasses(draft.status)}`}>
            {statusLabel(draft.status)}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="text-sm text-gray-600">שעת התחלה</span>
          <input
            type="time"
            value={draft.startTime}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, startTime: e.target.value } : prev))
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">שעת סיום</span>
          <input
            type="time"
            value={draft.endTime}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, endTime: e.target.value } : prev))
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
          />
        </label>
      </section>

      <section className="mb-6">
        <label className="block">
          <span className="text-sm text-gray-600">תיאור סצנה</span>
          <textarea
            value={draft.description}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))
            }
            rows={5}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
            placeholder="כתוב כאן את תיאור הסצנה..."
          />
        </label>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SceneEntitySection
          sceneId={scene.id}
          projectId={scene.shootDay.projectId}
          entityType="TALENT"
          title="שחקנים"
        />

        <SceneEntitySection
          sceneId={scene.id}
          projectId={scene.shootDay.projectId}
          entityType="CREW"
          title="אנשי צוות"
        />

        <SceneEntitySection
          sceneId={scene.id}
          projectId={scene.shootDay.projectId}
          entityType="CONTACTS"
          title="אנשי קשר"
        />

        <SceneEntitySection
          sceneId={scene.id}
          projectId={scene.shootDay.projectId}
          entityType="LOCATIONS"
          title="לוקיישנים"
        />

        <SceneEntitySection
          sceneId={scene.id}
          projectId={scene.shootDay.projectId}
          entityType="ASSETS"
          title="נכסים"
        />
      </section>

      {showUnsavedDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-5 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              בוצעו שינויים שלא נשמרו
            </h2>

            <p className="text-sm text-gray-600 mb-5">
              האם תרצה לשמור את השינויים לפני היציאה מהסצנה?
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedDialog(false)}
                disabled={saving || duplicating}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  router.push(backHref);
                }}
                disabled={saving || duplicating}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                לא, צא בלי לשמור
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowUnsavedDialog(false);
                  await saveAndExit();
                }}
                disabled={saving || duplicating}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                כן, שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}