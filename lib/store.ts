"use client";

import { create } from "zustand";
import type {
  Project,
  ShootDay,
  Scene,
  Transition,
  Item,
  ItemRecord,
  ItemStatus,
  ItemWithDetails,
  LocationsDetails,
  NotesDetails,
  ScheduleDetails,
  ScenesDetails,
  TalentDetails,
  User,
} from "@/types";
import type { ThemeId } from "@/types";
import { SectionType, DEFAULT_DETAILS } from "@/types";
import * as db from "./db";
import { parseDetails } from "./item-details";
import { scheduleAutoBackup } from "./autoBackup";
import { applyTheme } from "./theme/applyTheme";

type ItemDetails = ItemWithDetails["details"];

type ApiProject = {
  id: string;
  name: string;
  clientName: string | null;
  projectOrderIndex: number | null;
  colorTag: Project["colorTag"] | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

interface AppState {
  hydrated: boolean;
  currentUserId: string | null;
  themeId: ThemeId;
  users: User[];
  projects: Project[];
  shootDays: Record<string, ShootDay[]>;
  items: Record<string, ItemRecord[]>;
  scenes: Record<string, Scene[]>;
  transitions: Record<string, Transition[]>;
  setHydrated: (v: boolean) => void;
  loadUsers: () => Promise<void>;
  setCurrentUserId: (userId: string | null) => void;
  setThemeId: (themeId: ThemeId) => void;
  loadThemeFromCurrentUser: () => void;
  addUser: (displayName: string) => Promise<User>;
  loadProjects: () => Promise<void>;
  loadShootDays: (projectId: string) => Promise<void>;
  loadItems: (shootDayId: string) => Promise<void>;
  loadScenes: (shootDayId: string) => Promise<void>;
  loadTransitions: (shootDayId: string) => Promise<void>;
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  restoreProject: (project: Project) => Promise<void>;
  addShootDay: (day: Omit<ShootDay, "id">) => Promise<ShootDay>;
  updateShootDay: (id: string, patch: Partial<ShootDay>) => Promise<void>;
  deleteShootDay: (id: string) => Promise<void>;
  restoreShootDay: (day: ShootDay) => Promise<void>;
  addScene: (scene: Omit<Scene, "id" | "createdAt" | "updatedAt">) => Promise<Scene>;
  updateScene: (id: string, patch: Partial<Scene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  restoreScene: (scene: Scene) => Promise<void>;
  addTransition: (t: Omit<Transition, "id" | "createdAt" | "updatedAt">) => Promise<Transition>;
  updateTransition: (id: string, patch: Partial<Transition>) => Promise<void>;
  deleteTransition: (id: string) => Promise<void>;
  addItem: (item: Omit<Item, "createdAt" | "updatedAt">, details: ItemDetails) => Promise<ItemRecord>;
  updateItem: (id: string, patch: Partial<Item>, details?: ItemDetails) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemWithDetails: (id: string) => Promise<ItemWithDetails | undefined>;
  getShootDay: (id: string) => Promise<ShootDay | undefined>;
  clearCache: () => void;
  seedIfEmpty: () => Promise<void>;
  loadLastUserFromStorage: () => void;
  loginOrCreateUserByName: (name: string) => Promise<void>;
  logoutToUserChooser: () => void;
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const LAST_USER_KEY = "asaf:lastUserId";

function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const ai = a.projectOrderIndex ?? Number.MAX_SAFE_INTEGER;
    const bi = b.projectOrderIndex ?? Number.MAX_SAFE_INTEGER;

    if (ai !== bi) return ai - bi;

    const ad = a.createdAt ?? "";
    const bd = b.createdAt ?? "";

    if (ad !== bd) return ad.localeCompare(bd);

    return a.id.localeCompare(b.id);
  });
}

function mapApiProject(project: ApiProject): Project {
  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName ?? "",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    projectOrderIndex: project.projectOrderIndex ?? undefined,
    colorTag: project.colorTag ?? null,
  };
}

async function parseProjectResponse(res: Response): Promise<Project> {
  const json: unknown = await res.json();

  if (
    typeof json === "object" &&
    json !== null &&
    "project" in json
  ) {
    const wrapped = json as { project?: ApiProject };
    if (!wrapped.project) {
      throw new Error("Project payload is missing");
    }
    return mapApiProject(wrapped.project);
  }

  return mapApiProject(json as ApiProject);
}

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  currentUserId: null,
  themeId: "b",
  users: [],
  projects: [],
  shootDays: {},
  items: {},
  scenes: {},
  transitions: {},

  setHydrated: (v) => set({ hydrated: v }),

  loadLastUserFromStorage: () => {
    if (typeof window === "undefined") return;
    const lastId = localStorage.getItem(LAST_USER_KEY);
    if (!lastId) return;
    const users = get().users;
    const found = users.find((u) => u.id === lastId);
    if (found) {
      set({ currentUserId: lastId });
      db.setCurrentUserId(lastId);
    }
  },

  loadUsers: async () => {
    const users = await db.getUsers();
    set({ users });
    get().loadLastUserFromStorage();
    if (!get().currentUserId && get().users.length > 0) {
      get().setCurrentUserId(get().users[0]!.id);
    } else {
      get().loadThemeFromCurrentUser();
      void get().loadProjects();
    }
  },

  setCurrentUserId: (userId) => {
    db.setCurrentUserId(userId);
    set({ currentUserId: userId });
    if (userId && typeof window !== "undefined") {
      localStorage.setItem(LAST_USER_KEY, userId);
    }
    get().loadThemeFromCurrentUser();
    void get().loadProjects();
  },

  loginOrCreateUserByName: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const users = get().users;
    const existing = users.find(
      (u) => u.displayName.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      get().setCurrentUserId(existing.id);
    } else {
      const created = await get().addUser(trimmed);
      get().setCurrentUserId(created.id);
    }
  },

  logoutToUserChooser: () => {
    if (typeof window !== "undefined") localStorage.removeItem(LAST_USER_KEY);
    db.setCurrentUserId(null);
    set({ currentUserId: null, projects: [] });
  },

  setThemeId: (themeId) => {
    set({ themeId });
    applyTheme(themeId);
    const uid = get().currentUserId;
    if (uid) {
      const user = get().users.find((u) => u.id === uid);
      if (user) void db.putUser({ ...user, themeId });
    }
  },

  loadThemeFromCurrentUser: () => {
    const uid = get().currentUserId;
    const users = get().users;
    const user = uid ? users.find((u) => u.id === uid) : null;
    const themeId: ThemeId = user?.themeId ?? "b";
    set({ themeId });
    applyTheme(themeId);
  },

  addUser: async (displayName) => {
    const user: User = {
      id: id(),
      displayName: displayName.trim() || "משתמש",
      themeId: "b",
    };
    await db.putUser(user);
    await get().loadUsers();
    return user;
  },

  loadProjects: async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PB] loadProjects from API");
    }

    try {
      const res = await fetch("/api/projects", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 401) {
        set({ projects: [] });
        return;
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to load projects (${res.status})`);
      }

      const json = (await res.json()) as { projects?: ApiProject[] };
      const projects = (json.projects ?? []).map(mapApiProject);
      set({ projects: sortProjects(projects) });
    } catch (err) {
      console.error("LOAD_PROJECTS_ERROR:", err);
      set({ projects: [] });
    }
  },

  loadShootDays: async (projectId: string) => {
    if (process.env.NODE_ENV === "development") console.log("[PB] loadShootDays", projectId);
    const days = await db.getShootDaysByProject(projectId);
    set((s) => ({ shootDays: { ...s.shootDays, [projectId]: days } }));
  },

  loadItems: async (shootDayId: string) => {
    if (process.env.NODE_ENV === "development") console.log("[PB] loadItems", shootDayId);
    const items = await db.getItemsByShootDay(shootDayId);
    set((s) => ({ items: { ...s.items, [shootDayId]: items } }));
  },

  loadScenes: async (shootDayId: string) => {
    if (process.env.NODE_ENV === "development") console.log("[PB] loadScenes", shootDayId);
    const scenes = await db.getScenesByShootDay(shootDayId);
    set((s) => ({ scenes: { ...s.scenes, [shootDayId]: scenes } }));
  },

  loadTransitions: async (shootDayId: string) => {
    if (process.env.NODE_ENV === "development") console.log("[PB] loadTransitions", shootDayId);
    const transitions = await db.getTransitionsByShootDay(shootDayId);
    set((s) => ({ transitions: { ...s.transitions, [shootDayId]: transitions } }));
  },

  addProject: async (project) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: project.name.trim(),
        clientName: project.clientName?.trim() || null,
        projectOrderIndex: project.projectOrderIndex ?? undefined,
        colorTag: project.colorTag ?? null,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || `Failed to create project (${res.status})`);
    }

    const created = await parseProjectResponse(res);

    set((state) => ({
      projects: sortProjects([...state.projects, created]),
    }));

    return created;
  },

  updateProject: async (projectId, patch) => {
    const body: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(patch, "name")) {
      body.name = patch.name;
    }

    if (Object.prototype.hasOwnProperty.call(patch, "clientName")) {
      body.clientName = patch.clientName ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(patch, "projectOrderIndex")) {
      body.projectOrderIndex = patch.projectOrderIndex ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(patch, "colorTag")) {
      body.colorTag = patch.colorTag ?? null;
    }

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || `Failed to update project (${res.status})`);
    }

    const updated = await parseProjectResponse(res);

    set((state) => ({
      projects: sortProjects(
        state.projects.map((p) => (p.id === projectId ? updated : p))
      ),
    }));
  },

  deleteProject: async (projectId) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || `Failed to delete project (${res.status})`);
    }

    set((s) => {
      const { [projectId]: _, ...restShootDays } = s.shootDays;
      return {
        projects: s.projects.filter((p) => p.id !== projectId),
        shootDays: restShootDays,
      };
    });
  },

  restoreProject: async (project) => {
    await get().addProject({
      name: project.name,
      clientName: project.clientName,
      projectOrderIndex: project.projectOrderIndex,
      colorTag: project.colorTag ?? undefined,
    });
  },

  addShootDay: async (day) => {
    const uid = get().currentUserId;
    const full: ShootDay = {
      ...day,
      id: id(),
      ownerUserId: uid ?? undefined,
    };
    await db.putShootDay(full);
    await get().loadShootDays(day.projectId);
    scheduleAutoBackup();
    return full;
  },

  updateShootDay: async (id, patch) => {
    const existing = await db.getShootDay(id);
    if (!existing) return;
    const updated: ShootDay = { ...existing, ...patch };
    await db.putShootDay(updated);
    await get().loadShootDays(existing.projectId);
    scheduleAutoBackup();
  },

  deleteShootDay: async (id) => {
    const existing = await db.getShootDay(id);
    if (!existing) return;
    await db.deleteShootDay(id);
    await get().loadShootDays(existing.projectId);
    set((s) => {
      const next = { ...s.items };
      delete next[id];
      const nextScenes = { ...s.scenes };
      delete nextScenes[id];
      const nextTransitions = { ...s.transitions };
      delete nextTransitions[id];
      return { items: next, scenes: nextScenes, transitions: nextTransitions };
    });
    scheduleAutoBackup();
  },

  restoreShootDay: async (day) => {
    await db.putShootDay(day);
    await get().loadShootDays(day.projectId);
    scheduleAutoBackup();
  },

  addScene: async (sceneInput) => {
    const t = now();
    const uid = get().currentUserId;
    const scene: Scene = {
      ...sceneInput,
      id: id(),
      createdAt: t,
      updatedAt: t,
      ownerUserId: uid ?? undefined,
    };
    await db.putScene(scene);
    await get().loadScenes(scene.shootDayId);
    scheduleAutoBackup();
    return scene;
  },

  updateScene: async (sceneId, patch) => {
    const existing = await db.getScene(sceneId);
    if (!existing) return;
    const updated: Scene = {
      ...existing,
      ...patch,
      updatedAt: now(),
    };
    await db.putScene(updated);
    await get().loadScenes(updated.shootDayId);
    scheduleAutoBackup();
  },

  deleteScene: async (sceneId) => {
    const existing = await db.getScene(sceneId);
    if (!existing) return;
    await db.deleteScene(sceneId);
    await get().loadScenes(existing.shootDayId);
    await get().loadTransitions(existing.shootDayId);
    scheduleAutoBackup();
  },

  restoreScene: async (scene) => {
    await db.putScene(scene);
    await get().loadScenes(scene.shootDayId);
    scheduleAutoBackup();
  },

  addTransition: async (t) => {
    const currentNow = new Date().toISOString();
    const full: Transition = {
      ...t,
      id: id(),
      createdAt: currentNow,
      updatedAt: currentNow,
    };
    await db.putTransition(full);
    await get().loadTransitions(full.shootDayId);
    scheduleAutoBackup();
    return full;
  },

  updateTransition: async (transitionId, patch) => {
    const existing = await db.getTransition(transitionId);
    if (!existing) return;
    const updated: Transition = {
      ...existing,
      ...patch,
      updatedAt: now(),
    };
    await db.putTransition(updated);
    await get().loadTransitions(updated.shootDayId);
    scheduleAutoBackup();
  },

  deleteTransition: async (transitionId) => {
    const existing = await db.getTransition(transitionId);
    if (!existing) return;
    await db.deleteTransition(transitionId);
    await get().loadTransitions(existing.shootDayId);
    scheduleAutoBackup();
  },

  addItem: async (item, details) => {
    const t = now();
    const detailsJson = JSON.stringify(details);
    const record: ItemRecord = {
      ...item,
      id: item.id || id(),
      createdAt: t,
      updatedAt: t,
      detailsJson,
    };
    await db.putItem(record);
    await get().loadItems(item.shootDayId);
    scheduleAutoBackup();
    return record;
  },

  updateItem: async (itemId, patch, details) => {
    const existing = await db.getItem(itemId);
    if (!existing) return;
    let detailsJson = existing.detailsJson;
    if (details) detailsJson = JSON.stringify(details);
    const updated: ItemRecord = {
      ...existing,
      ...patch,
      detailsJson,
      updatedAt: now(),
    };
    await db.putItem(updated);
    await get().loadItems(existing.shootDayId);
    scheduleAutoBackup();
  },

  deleteItem: async (itemId) => {
    const existing = await db.getItem(itemId);
    if (!existing) return;
    await db.deleteItem(itemId);
    await get().loadItems(existing.shootDayId);
    scheduleAutoBackup();
  },

  getItemWithDetails: async (itemId) => {
    const record = await db.getItem(itemId);
    if (!record) return undefined;
    return parseDetails(record);
  },

  getShootDay: async (dayId) => db.getShootDay(dayId),

  clearCache: () => set({ shootDays: {}, items: {}, scenes: {}, transitions: {} }),

  seedIfEmpty: async () => {
    if (!(await db.isDbEmpty())) return;
    const t = now();
    const project: Project = {
      id: id(),
      name: "פרויקט לדוגמה",
      clientName: "לקוח לדוגמה",
      createdAt: t,
      updatedAt: t,
    };
    await db.putProject(project);
    const shootDay: ShootDay = {
      id: id(),
      projectId: project.id,
      title: "יום צילום 09/03",
      date: "2025-03-09",
      generalNotes: "הערות כלליות ליום הצילום.",
    };
    await db.putShootDay(shootDay);
    const items: { title: string; sectionType: SectionType; status: ItemStatus; details: ItemDetails }[] = [
      { title: "סצנה 1", sectionType: SectionType.SCENES, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.SCENES], description: "סצנת פתיחה", sceneNumber: "1" } as ScenesDetails },
      { title: "סצנה 2", sectionType: SectionType.SCENES, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.SCENES], description: "סצנה במשרד", sceneNumber: "2" } as ScenesDetails },
      { title: "סצנה 3", sectionType: SectionType.SCENES, status: "MISSING", details: { ...DEFAULT_DETAILS[SectionType.SCENES], description: "חסר צילום", sceneNumber: "3" } as ScenesDetails },
      { title: "שדרות יהודית", sectionType: SectionType.LOCATIONS, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.LOCATIONS], addressText: "שדרות יהודית 10, תל אביב", googleMapsUrl: "https://maps.google.com" } as LocationsDetails },
      { title: "שחקן ראשי", sectionType: SectionType.TALENT, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.TALENT], fullName: "דוגמה שחקן", role: "ראשי" } as TalentDetails },
      { title: "שחקנית משנה", sectionType: SectionType.TALENT, status: "BLOCKED", details: { ...DEFAULT_DETAILS[SectionType.TALENT], fullName: "דוגמה שחקנית", role: "משנה" } as TalentDetails },
      { title: "בוקר - הכנות", sectionType: SectionType.SCHEDULE, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.SCHEDULE], startTime: "08:00", endTime: "10:00", description: "הכנות וטיפוס" } as ScheduleDetails },
      { title: "הערה כללית", sectionType: SectionType.NOTES, status: "OK", details: { ...DEFAULT_DETAILS[SectionType.NOTES], richText: "להביא ציוד נוסף." } as NotesDetails },
    ];
    for (const it of items) {
      const record: ItemRecord = {
        id: id(),
        shootDayId: shootDay.id,
        sectionType: it.sectionType,
        title: it.title,
        status: it.status,
        tags: [],
        createdAt: t,
        updatedAt: t,
        detailsJson: JSON.stringify(it.details),
      };
      await db.putItem(record);
    }
    await get().loadProjects();
    await get().loadShootDays(project.id);
    await get().loadItems(shootDay.id);
  },
}));