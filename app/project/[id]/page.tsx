"use client";

import { CalendarPlus, FileDown, FileText, Pencil, Trash2, X, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AddShootDayForm } from "@/components/AddShootDayForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { fetchProjectPdf } from "@/lib/reports/fetchPdfFromApi";
import { downloadBlob } from "@/components/reports/pdfDownload";

type ApiProject = {
  id: string;
  name: string;
  clientName?: string | null;
  createdAt: string;
  userId: string;
};

type ApiUserLite = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

type ApiScenePreview = {
  id: string;
  shootOrderNumber: number;
  scriptSceneNumber: string | null;
  name: string;
  status: "OK" | "MISSING" | "BLOCKED";
};

type ApiShootDay = {
  id: string;
  projectId: string;
  title: string;
  date: string;
  location: string | null;
  callTime: string | null;
  notes: string | null;
  createdAt: string;
  createdByUser: ApiUserLite;
  scenes?: ApiScenePreview[];
};

type ApiProjectEntity = {
  id: string;
  projectId: string;
  entityType: "LOCATIONS" | "TALENT" | "CREW" | "CONTACTS" | "ASSETS";
  status: "OK" | "MISSING" | "BLOCKED";
  title: string;
  detailsJson: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type HumanDetails = {
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
  category?: string;
};

type LocationDetails = {
  address?: string;
  contactName?: string;
  parking?: "yes" | "no" | "";
  notes?: string;
};

type HumanEditorState = {
  mode: "create" | "edit";
  entityId: string | null;
  entityType: "CREW" | "TALENT" | "CONTACTS";
  title: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
  category: string;
};

type LocationEditorState = {
  mode: "create" | "edit";
  entityId: string | null;
  title: string;
  address: string;
  contactName: string;
  parking: "yes" | "no" | "";
  notes: string;
};

type HumanGroupKey = "CREW" | "TALENT" | "CONTACTS";

const CREW_CATEGORY_OPTIONS = [
  "הפקה",
  "בימוי",
  "מצלמה",
  "תאורה",
  "סאונד",
  "ארט",
  "איפור ושיער",
  "פוסט",
  "לוגיסטיקה",
  "כללי",
] as const;

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

function parseHumanDetails(detailsJson: string): Required<HumanDetails> {
  try {
    const parsed = JSON.parse(detailsJson || "{}") as HumanDetails;
    return {
      role: typeof parsed.role === "string" ? parsed.role : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      category: typeof parsed.category === "string" ? parsed.category : "",
    };
  } catch {
    return {
      role: "",
      phone: "",
      email: "",
      notes: "",
      category: "",
    };
  }
}

function parseLocationDetails(detailsJson: string): Required<LocationDetails> {
  try {
    const parsed = JSON.parse(detailsJson || "{}") as LocationDetails;
    return {
      address: typeof parsed.address === "string" ? parsed.address : "",
      contactName: typeof parsed.contactName === "string" ? parsed.contactName : "",
      parking: parsed.parking === "yes" || parsed.parking === "no" ? parsed.parking : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return {
      address: "",
      contactName: "",
      parking: "",
      notes: "",
    };
  }
}

function buildEmptyHumanEditor(): HumanEditorState {
  return {
    mode: "create",
    entityId: null,
    entityType: "CREW",
    title: "",
    role: "",
    phone: "",
    email: "",
    notes: "",
    category: "כללי",
  };
}

function buildEmptyLocationEditor(): LocationEditorState {
  return {
    mode: "create",
    entityId: null,
    title: "",
    address: "",
    contactName: "",
    parking: "",
    notes: "",
  };
}

function defaultCategoryForEntityType(
  entityType: ApiProjectEntity["entityType"] | HumanEditorState["entityType"]
): string {
  if (entityType === "TALENT") return "שחקנים";
  if (entityType === "CONTACTS") return "ספקים חיצוניים";
  return "כללי";
}

function buildHumanEditorFromEntity(entity: ApiProjectEntity): HumanEditorState {
  const details = parseHumanDetails(entity.detailsJson);

  return {
    mode: "edit",
    entityId: entity.id,
    entityType: entity.entityType as "CREW" | "TALENT" | "CONTACTS",
    title: entity.title ?? "",
    role: details.role,
    phone: details.phone,
    email: details.email,
    notes: details.notes,
    category: details.category || defaultCategoryForEntityType(entity.entityType),
  };
}

function buildLocationEditorFromEntity(entity: ApiProjectEntity): LocationEditorState {
  const details = parseLocationDetails(entity.detailsJson);

  return {
    mode: "edit",
    entityId: entity.id,
    title: entity.title ?? "",
    address: details.address,
    contactName: details.contactName,
    parking: details.parking,
    notes: details.notes,
  };
}

function subtitleForHuman(entity: ApiProjectEntity): string {
  const details = parseHumanDetails(entity.detailsJson);
  const parts = [details.role.trim(), details.phone.trim(), details.email.trim()].filter(Boolean);
  return parts.join(" · ");
}

function subtitleForLocation(entity: ApiProjectEntity): string {
  const details = parseLocationDetails(entity.detailsJson);
  const parts = [
    details.address.trim(),
    details.contactName.trim(),
    details.parking === "yes" ? "יש חניה" : details.parking === "no" ? "אין חניה" : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function groupTitle(group: HumanGroupKey): string {
  if (group === "CREW") return "אנשי צוות";
  if (group === "TALENT") return "שחקנים";
  return "ספקים חיצוניים";
}

function groupDescription(group: HumanGroupKey): string {
  if (group === "CREW") return "במאים, צילום, סאונד, הפקה ועוד.";
  if (group === "TALENT") return "שחקנים, טאלנטים, ניצבים ודמויות בפרויקט.";
  return "ספקים, פרילנסרים, נותני שירות ואנשי קשר חיצוניים.";
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [shootDays, setShootDays] = useState<ApiShootDay[]>([]);
  const [humans, setHumans] = useState<ApiProjectEntity[]>([]);
  const [locations, setLocations] = useState<ApiProjectEntity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showAddShootDay, setShowAddShootDay] = useState(false);

  const [humanEditor, setHumanEditor] = useState<HumanEditorState | null>(null);
  const [savingHuman, setSavingHuman] = useState(false);
  const [deletingHumanId, setDeletingHumanId] = useState<string | null>(null);
  const [openHumanGroup, setOpenHumanGroup] = useState<HumanGroupKey | null>(null);

  const [locationEditor, setLocationEditor] = useState<LocationEditorState | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [openLocations, setOpenLocations] = useState(false);

  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [savingProjectName, setSavingProjectName] = useState(false);
  const [editingClientName, setEditingClientName] = useState(false);
  const [clientNameDraft, setClientNameDraft] = useState("");
  const [savingClientName, setSavingClientName] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const [
        projectRes,
        shootDaysRes,
        crewRes,
        talentRes,
        contactsRes,
        locationsRes,
      ] = await Promise.all([
        fetch(`/api/projects/${projectId}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/shoot-days`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/entities?entityType=CREW`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/entities?entityType=TALENT`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/entities?entityType=CONTACTS`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/entities?entityType=LOCATIONS`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      if (!projectRes.ok) {
        const j = await projectRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load project (${projectRes.status})`);
      }

      if (!shootDaysRes.ok) {
        const j = await shootDaysRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load shoot days (${shootDaysRes.status})`);
      }

      if (!crewRes.ok) {
        const j = await crewRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load crew (${crewRes.status})`);
      }

      if (!talentRes.ok) {
        const j = await talentRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load talent (${talentRes.status})`);
      }

      if (!contactsRes.ok) {
        const j = await contactsRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load contacts (${contactsRes.status})`);
      }

      if (!locationsRes.ok) {
        const j = await locationsRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load locations (${locationsRes.status})`);
      }

      const projectJson = (await projectRes.json()) as { project: ApiProject };
      const shootDaysJson = (await shootDaysRes.json()) as { shootDays: ApiShootDay[] };
      const crewJson = (await crewRes.json()) as { entities: ApiProjectEntity[] };
      const talentJson = (await talentRes.json()) as { entities: ApiProjectEntity[] };
      const contactsJson = (await contactsRes.json()) as { entities: ApiProjectEntity[] };
      const locationsJson = (await locationsRes.json()) as { entities: ApiProjectEntity[] };

      setProject(projectJson.project);
setProjectNameDraft(projectJson.project?.name ?? "");
setClientNameDraft(projectJson.project?.clientName ?? "");
setShootDays(shootDaysJson.shootDays ?? []);
      setHumans([
        ...(crewJson.entities ?? []),
        ...(talentJson.entities ?? []),
        ...(contactsJson.entities ?? []),
      ]);
      setLocations(
        [...(locationsJson.entities ?? [])].sort((a, b) => a.title.localeCompare(b.title, "he"))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setProject(null);
      setShootDays([]);
      setHumans([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const sortedShootDays = useMemo(() => {
    return [...shootDays].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [shootDays]);

  const humansByGroup = useMemo(() => {
    const crew = humans
      .filter((human) => human.entityType === "CREW")
      .sort((a, b) => a.title.localeCompare(b.title, "he"));

    const talent = humans
      .filter((human) => human.entityType === "TALENT")
      .sort((a, b) => a.title.localeCompare(b.title, "he"));

    const contacts = humans
      .filter((human) => human.entityType === "CONTACTS")
      .sort((a, b) => a.title.localeCompare(b.title, "he"));

    return {
      CREW: crew,
      TALENT: talent,
      CONTACTS: contacts,
    };
  }, [humans]);

  const humanGroupCards = useMemo(
    () => [
      {
        key: "CREW" as const,
        title: groupTitle("CREW"),
        description: groupDescription("CREW"),
        count: humansByGroup.CREW.length,
      },
      {
        key: "TALENT" as const,
        title: groupTitle("TALENT"),
        description: groupDescription("TALENT"),
        count: humansByGroup.TALENT.length,
      },
      {
        key: "CONTACTS" as const,
        title: groupTitle("CONTACTS"),
        description: groupDescription("CONTACTS"),
        count: humansByGroup.CONTACTS.length,
      },
    ],
    [humansByGroup]
  );

  const openGroupItems = openHumanGroup ? humansByGroup[openHumanGroup] : [];

  const saveHuman = useCallback(async () => {
    if (!humanEditor) return;

    const title = humanEditor.title.trim();
    if (!title) {
      window.alert("צריך להזין שם.");
      return;
    }

    setSavingHuman(true);

    try {
      const detailsJson = JSON.stringify({
        role: humanEditor.role.trim(),
        phone: humanEditor.phone.trim(),
        email: humanEditor.email.trim(),
        notes: humanEditor.notes.trim(),
        category:
          humanEditor.entityType === "CREW"
            ? humanEditor.category.trim() || "כללי"
            : defaultCategoryForEntityType(humanEditor.entityType),
      });

      if (humanEditor.mode === "create") {
        const res = await fetch(`/api/projects/${projectId}/entities`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entityType: humanEditor.entityType,
            title,
            status: "OK",
            detailsJson,
            tags: [],
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to create human (${res.status})`);
        }
      } else {
        const entityId = humanEditor.entityId;
        if (!entityId) {
          throw new Error("Missing entity id");
        }

        const res = await fetch(`/api/entities/${entityId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            status: "OK",
            detailsJson,
            tags: [],
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to update human (${res.status})`);
        }
      }

      setHumanEditor(null);
      await loadAll();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingHuman(false);
    }
  }, [humanEditor, loadAll, projectId]);

  const deleteHuman = useCallback(
    async (entityId: string) => {
      const confirmed = window.confirm(
        "למחוק את האיש/ה מהפרויקט? הוא או היא יוסרו גם מכל סצנה שאליה שובצו."
      );

      if (!confirmed) return;

      setDeletingHumanId(entityId);

      try {
        const res = await fetch(`/api/entities/${entityId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to delete human (${res.status})`);
        }

        if (humanEditor?.mode === "edit" && humanEditor.entityId === entityId) {
          setHumanEditor(null);
        }

        await loadAll();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setDeletingHumanId(null);
      }
    },
    [humanEditor, loadAll]
  );

  const saveLocation = useCallback(async () => {
    if (!locationEditor) return;

    const title = locationEditor.title.trim();
    if (!title) {
      window.alert("צריך להזין שם לוקיישן.");
      return;
    }

    setSavingLocation(true);

    try {
      const detailsJson = JSON.stringify({
        address: locationEditor.address.trim(),
        contactName: locationEditor.contactName.trim(),
        parking: locationEditor.parking,
        notes: locationEditor.notes.trim(),
      });

      if (locationEditor.mode === "create") {
        const res = await fetch(`/api/projects/${projectId}/entities`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entityType: "LOCATIONS",
            title,
            status: "OK",
            detailsJson,
            tags: [],
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to create location (${res.status})`);
        }
      } else {
        const entityId = locationEditor.entityId;
        if (!entityId) {
          throw new Error("Missing location id");
        }

        const res = await fetch(`/api/entities/${entityId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            status: "OK",
            detailsJson,
            tags: [],
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to update location (${res.status})`);
        }
      }

      setLocationEditor(null);
      await loadAll();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingLocation(false);
    }
  }, [locationEditor, loadAll, projectId]);

  const deleteLocation = useCallback(
    async (entityId: string) => {
      const confirmed = window.confirm(
        "למחוק את הלוקיישן מהפרויקט? הוא יוסר גם מכל סצנה שאליה שובץ."
      );

      if (!confirmed) return;

      setDeletingLocationId(entityId);

      try {
        const res = await fetch(`/api/entities/${entityId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to delete location (${res.status})`);
        }

        if (locationEditor?.mode === "edit" && locationEditor.entityId === entityId) {
          setLocationEditor(null);
        }

        await loadAll();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setDeletingLocationId(null);
      }
    },
    [locationEditor, loadAll]
  );
  const saveProjectName = useCallback(async () => {
    const nextName = projectNameDraft.trim();
  
    if (!project?.id) return;
  
    if (!nextName) {
      window.alert("צריך להזין שם פרויקט.");
      return;
    }
  
    setSavingProjectName(true);
  
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName,
        }),
      });
  
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to update project (${res.status})`);
      }
  
      const json = await res.json();
      const updatedProject = json.project ?? null;
  
      if (!updatedProject) {
        throw new Error("Project payload is missing");
      }
  
      setProject(updatedProject);
      setProjectNameDraft(updatedProject.name ?? "");
      setEditingProjectName(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingProjectName(false);
    }
  }, [project?.id, projectNameDraft]);
  const saveClientName = useCallback(async () => {
    if (!project?.id) return;
  
    setSavingClientName(true);
  
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientNameDraft.trim() || null,
        }),
      });
  
      const json = await res.json();
  
      if (!res.ok) {
        throw new Error(json?.error || "Failed to update client name");
      }
  
      setProject(json.project ?? null);
      setClientNameDraft(json.project?.clientName ?? "");
      setEditingClientName(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingClientName(false);
    }
  }, [project?.id, clientNameDraft]);

  const exportProductionReport = useCallback(async () => {
    if (!projectId) return;
    setExportingReport(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/report-snapshot`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load report snapshot");
      }
      const snapshot = await res.json();
      const { blob, filename } = await fetchProjectPdf(snapshot);
      downloadBlob(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingReport(false);
    }
  }, [projectId]);
  
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-4 py-6 md:p-6 max-w-5xl mx-auto">
        <Link href="/" className="text-blue-600 underline text-sm">
          ← כל הפרויקטים
        </Link>

        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          נסה שוב
        </button>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen px-4 py-6 md:p-6 max-w-5xl mx-auto">
        <Link href="/" className="text-blue-600 underline text-sm">
          ← כל הפרויקטים
        </Link>
        <p className="mt-4 text-gray-500">פרויקט לא נמצא.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 md:p-6 max-w-5xl mx-auto bg-app text-app overflow-x-hidden md:overflow-x-visible">
       <Breadcrumbs
      items={[
        { label: "לוח הפקה", href: "/" },
        { label: project.name },
      ]}
    />
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/" className="text-app opacity-70 text-sm hover:underline">
            ← כל הפרויקטים
          </Link>

          {!editingProjectName ? (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-app">{project.name}</h1>

              <button
                type="button"
                onClick={() => {
                  setProjectNameDraft(project.name ?? "");
                  setEditingProjectName(true);
                }}
                className="flex items-center gap-1 text-sm px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <Pencil size={15} strokeWidth={1.8} />
                ערוך
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                disabled={savingProjectName}
                className="w-full max-w-md border border-gray-300 rounded px-3 py-2 bg-white text-black"
              />

              <button
                type="button"
                onClick={() => void saveProjectName()}
                disabled={savingProjectName}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm"
              >
                {savingProjectName ? "שומר..." : "שמור"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectNameDraft(project.name ?? "");
                  setEditingProjectName(false);
                }}
                disabled={savingProjectName}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm"
              >
                ביטול
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-2">
          <Link
            href={`/project/${projectId}/proposals/new`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-app hover:opacity-90 w-full md:w-auto justify-center md:justify-start"
          >
            <FileText size={18} />
            צור הצעת מחיר
          </Link>
          <button
            type="button"
            onClick={() => void exportProductionReport()}
            disabled={exportingReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-app hover:opacity-90 disabled:opacity-50 w-full md:w-auto justify-center md:justify-start"
          >
            <FileDown size={18} />
            {exportingReport ? "מייצא..." : "ייצא דוח הפקה"}
          </button>
          {!showAddShootDay ? (
            <button
              type="button"
              onClick={() => setShowAddShootDay(true)}
              className="flex items-center gap-2 px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 w-full md:w-auto justify-center md:justify-start"
            >
              <CalendarPlus size={18} />
              הוסף יום צילום
            </button>
          ) : null}
        </div>
      </header>

      <section className="mb-8 p-4 rounded-lg border border-app surface-app">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">אנשים בפרויקט ({humans.length})</h2>

          {!humanEditor ? (
            <button
              type="button"
              onClick={() => setHumanEditor(buildEmptyHumanEditor())}
              className="px-4 py-2 rounded-lg border border-app hover:opacity-90"
            >
              + הוסף אדם לפרויקט
            </button>
          ) : null}
        </div>

        {humanEditor ? (
          <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
            <div className="text-sm font-medium mb-3">
              {humanEditor.mode === "create" ? "יצירת אדם חדש בפרויקט" : "עריכת אדם בפרויקט"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">שם</span>
                <input
                  type="text"
                  value={humanEditor.title}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">סוג אדם</span>
                <select
                  value={humanEditor.entityType}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev
                        ? {
                            ...prev,
                            entityType: e.target.value as "CREW" | "TALENT" | "CONTACTS",
                            category:
                              e.target.value === "CREW"
                                ? prev.category || "כללי"
                                : defaultCategoryForEntityType(
                                    e.target.value as "CREW" | "TALENT" | "CONTACTS"
                                  ),
                          }
                        : prev
                    )
                  }
                  disabled={humanEditor.mode === "edit"}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black disabled:bg-gray-100"
                >
                  <option value="CREW">איש צוות</option>
                  <option value="TALENT">שחקן / טאלנט</option>
                  <option value="CONTACTS">ספק / איש קשר חיצוני</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">תפקיד</span>
                <input
                  type="text"
                  value={humanEditor.role}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev ? { ...prev, role: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              {humanEditor.entityType === "CREW" ? (
                <label className="block">
                  <span className="text-sm text-gray-600">קטגוריה</span>
                  <select
                    value={humanEditor.category}
                    onChange={(e) =>
                      setHumanEditor((prev) =>
                        prev ? { ...prev, category: e.target.value } : prev
                      )
                    }
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                  >
                    {CREW_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm text-gray-600">קטגוריה</span>
                  <input
                    type="text"
                    value={defaultCategoryForEntityType(humanEditor.entityType)}
                    disabled
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-sm text-gray-600">טלפון</span>
                <input
                  type="text"
                  value={humanEditor.phone}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev ? { ...prev, phone: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm text-gray-600">מייל</span>
                <input
                  type="text"
                  value={humanEditor.email}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev ? { ...prev, email: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm text-gray-600">הערות</span>
                <textarea
                  value={humanEditor.notes}
                  onChange={(e) =>
                    setHumanEditor((prev) =>
                      prev ? { ...prev, notes: e.target.value } : prev
                    )
                  }
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHumanEditor(null)}
                disabled={savingHuman}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={() => void saveHuman()}
                disabled={savingHuman}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingHuman ? "שומר..." : humanEditor.mode === "create" ? "אישור" : "עדכון"}
              </button>
            </div>
          </div>
        ) : null}

        {humanGroupCards.every((group) => group.count === 0) ? (
          <div className="mt-4 text-gray-500 py-6 text-center border border-dashed border-gray-300 rounded-lg">
            עדיין לא הוגדרו אנשים לפרויקט.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {humanGroupCards.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setOpenHumanGroup(group.key)}
                className="text-right p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-black">{group.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{group.description}</div>
                  </div>

                  <div className="shrink-0 min-w-[42px] h-[42px] rounded-full bg-gray-100 text-black flex items-center justify-center font-semibold">
                    {group.count}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {openHumanGroup ? (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-black">
                    {groupTitle(openHumanGroup)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {openGroupItems.length} פריטים
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenHumanGroup(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {openGroupItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    אין אנשים בקבוצה הזאת עדיין.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {openGroupItems.map((human) => {
                      const subtitle = subtitleForHuman(human);

                      return (
                        <li
                          key={human.id}
                          className="px-5 py-4 flex items-start justify-between gap-4"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenHumanGroup(null);
                              setHumanEditor(buildHumanEditorFromEntity(human));
                            }}
                            className="min-w-0 flex-1 text-right"
                          >
                            <div className="font-medium text-black">{human.title}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {subtitle || "ללא מידע נוסף"}
                            </div>
                          </button>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenHumanGroup(null);
                                setHumanEditor(buildHumanEditorFromEntity(human));
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100"
                            >
                              <Pencil size={15} strokeWidth={1.8} />
                              ערוך
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteHuman(human.id)}
                              disabled={deletingHumanId === human.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingHumanId === human.id ? (
                                "מוחק..."
                              ) : (
                                <>
                                  <Trash2 size={16} strokeWidth={1.8} />
                                  מחק
                                </>
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mb-8 p-4 rounded-lg border border-app surface-app">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin size={18} />
            <h2 className="text-lg font-semibold">לוקיישנים בפרויקט ({locations.length})</h2>
          </div>

          {!locationEditor ? (
            <button
              type="button"
              onClick={() => setLocationEditor(buildEmptyLocationEditor())}
              className="px-4 py-2 rounded-lg border border-app hover:opacity-90"
            >
              + הוסף לוקיישן
            </button>
          ) : null}
        </div>

        {locationEditor ? (
          <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
            <div className="text-sm font-medium mb-3">
              {locationEditor.mode === "create" ? "יצירת לוקיישן חדש" : "עריכת לוקיישן"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">שם לוקיישן</span>
                <input
                  type="text"
                  value={locationEditor.title}
                  onChange={(e) =>
                    setLocationEditor((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">כתובת</span>
                <input
                  type="text"
                  value={locationEditor.address}
                  onChange={(e) =>
                    setLocationEditor((prev) =>
                      prev ? { ...prev, address: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">איש קשר</span>
                <input
                  type="text"
                  value={locationEditor.contactName}
                  onChange={(e) =>
                    setLocationEditor((prev) =>
                      prev ? { ...prev, contactName: e.target.value } : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">חניה</span>
                <select
                  value={locationEditor.parking}
                  onChange={(e) =>
                    setLocationEditor((prev) =>
                      prev
                        ? {
                            ...prev,
                            parking: e.target.value as "yes" | "no" | "",
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                >
                  <option value="">לא הוגדר</option>
                  <option value="yes">יש חניה</option>
                  <option value="no">אין חניה</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm text-gray-600">הערות</span>
                <textarea
                  value={locationEditor.notes}
                  onChange={(e) =>
                    setLocationEditor((prev) =>
                      prev ? { ...prev, notes: e.target.value } : prev
                    )
                  }
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocationEditor(null)}
                disabled={savingLocation}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={() => void saveLocation()}
                disabled={savingLocation}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingLocation
                  ? "שומר..."
                  : locationEditor.mode === "create"
                  ? "אישור"
                  : "עדכון"}
              </button>
            </div>
          </div>
        ) : null}

        {locations.length === 0 ? (
          <div className="mt-4 text-gray-500 py-6 text-center border border-dashed border-gray-300 rounded-lg">
            עדיין לא הוגדרו לוקיישנים לפרויקט.
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setOpenLocations(true)}
              className="w-full text-right p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-black">לוקיישנים</div>
                  <div className="text-sm text-gray-500 mt-1">
                    כל הלוקיישנים שנשמרו לפרויקט וניתנים לשימוש חוזר בסצנות.
                  </div>
                </div>

                <div className="shrink-0 min-w-[42px] h-[42px] rounded-full bg-gray-100 text-black flex items-center justify-center font-semibold">
                  {locations.length}
                </div>
              </div>
            </button>
          </div>
        )}

        {openLocations ? (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-black">לוקיישנים</div>
                  <div className="text-sm text-gray-500 mt-1">{locations.length} פריטים</div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenLocations(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    אין לוקיישנים בפרויקט עדיין.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {locations.map((location) => {
                      const subtitle = subtitleForLocation(location);

                      return (
                        <li
                          key={location.id}
                          className="px-5 py-4 flex items-start justify-between gap-4"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenLocations(false);
                              setLocationEditor(buildLocationEditorFromEntity(location));
                            }}
                            className="min-w-0 flex-1 text-right"
                          >
                            <div className="font-medium text-black">{location.title}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {subtitle || "ללא מידע נוסף"}
                            </div>
                          </button>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenLocations(false);
                                setLocationEditor(buildLocationEditorFromEntity(location));
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100"
                            >
                              <Pencil size={15} strokeWidth={1.8} />
                              ערוך
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteLocation(location.id)}
                              disabled={deletingLocationId === location.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingLocationId === location.id ? (
                                "מוחק..."
                              ) : (
                                <>
                                  <Trash2 size={16} strokeWidth={1.8} />
                                  מחק
                                </>
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {showAddShootDay ? (
        <div className="mb-6">
          <AddShootDayForm
            projectId={projectId}
            onDone={() => setShowAddShootDay(false)}
            onCreated={() => {
              setShowAddShootDay(false);
              void loadAll();
            }}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ימי צילום</h2>

        {sortedShootDays.length === 0 ? (
          <div className="text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-lg">
            אין ימי צילום עדיין. לחץ על “הוסף יום צילום”.
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedShootDays.map((d) => {
              const sceneList = d.scenes ?? [];
              const previewLimit = 5;
              const previewScenes = sceneList.slice(0, previewLimit);
              const restCount = sceneList.length - previewLimit;
              return (
                <li key={d.id}>
                  <Link
                    href={`/shoot-day/${d.id}`}
                    className="block p-4 surface-app border border-app rounded-lg hover:shadow-sm hover:border-gray-300 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{d.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDateForDisplay(d.date)}
                        </div>

                        {(d.location || d.callTime) && (
                          <div className="text-sm text-gray-600 mt-2">
                            {d.location ? <span>{d.location}</span> : null}
                            {d.location && d.callTime ? <span className="mx-2">·</span> : null}
                            {d.callTime ? <span>Call Time: {d.callTime}</span> : null}
                          </div>
                        )}

                        {sceneList.length > 0 ? (
                          <div className="mt-2 pt-2 border-t border-gray-200/80">
                            <div className="text-xs text-gray-500 mb-1">סצינות</div>
                            <ul className="space-y-0.5">
                              {previewScenes.map((s) => (
                                <li key={s.id} className="text-sm text-gray-700 truncate">
                                  {s.scriptSceneNumber
                                    ? `${s.scriptSceneNumber} · ${s.name || "—"}`
                                    : s.name || "—"}
                                </li>
                              ))}
                              {restCount > 0 ? (
                                <li className="text-xs text-gray-500">
                                  + עוד {restCount}
                                </li>
                              ) : null}
                            </ul>
                          </div>
                        ) : null}

                        {d.notes ? (
                          <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                            {d.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-xs text-gray-500">
                        נוצר ע״י {d.createdByUser.username}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}