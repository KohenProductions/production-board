import Dexie, { type Table } from "dexie";
import type { Project, ShootDay, ItemRecord, Scene, Transition, User, ItemImage } from "@/types";
import type { BackupData } from "./backup";

const CURRENT_USER_ID_KEY = "productionBoard_currentUserId";

export interface BackupRecord {
  id: string;
  createdAt: string;
  /** Optional label, e.g. "אוטומטי" or "ידני" */
  label?: string;
  /** Legacy: "auto" for auto-backup */
  reason?: "auto" | "manual";
  data: BackupData;
}

export class ProductionBoardDB extends Dexie {
  projects!: Table<Project, string>;
  shootDays!: Table<ShootDay, string>;
  items!: Table<ItemRecord, string>;
  backups!: Table<BackupRecord, string>;
  scenes!: Table<Scene, string>;
  transitions!: Table<Transition, string>;
  users!: Table<User, string>;
  itemImages!: Table<ItemImage, string>;

  constructor() {
    super("ProductionBoardDB");
    this.version(1).stores({
      projects: "id, createdAt, updatedAt",
      shootDays: "id, projectId, date",
      items: "id, shootDayId, sectionType, updatedAt, createdAt",
    });
    this.version(2).stores({
      backups: "id, createdAt",
    });
    this.version(3).stores({
      projects: "id, createdAt, updatedAt",
      shootDays: "id, projectId, date",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt",
    });
    this.version(4).stores({
      projects: "id, createdAt, updatedAt",
      shootDays: "id, projectId, date",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
    });
    this.version(5).stores({
      projects: "id, createdAt, updatedAt",
      shootDays: "id, projectId, date",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
    });
    this.version(6).stores({
      projects: "id, projectOrderIndex, createdAt, updatedAt",
      shootDays: "id, projectId, date",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
    });
    this.version(7).stores({
      projects: "id, projectOrderIndex, createdAt, updatedAt, ownerUserId",
      shootDays: "id, projectId, date, ownerUserId",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt, ownerUserId",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
      users: "id",
    });
    this.version(8).stores({
      projects: "id, projectOrderIndex, createdAt, updatedAt, ownerUserId",
      shootDays: "id, projectId, date, ownerUserId",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt, ownerUserId",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
      users: "id",
    });
    this.version(9).stores({
      projects: "id, projectOrderIndex, createdAt, updatedAt, ownerUserId",
      shootDays: "id, projectId, date, ownerUserId",
      items: "id, shootDayId, sceneId, sectionType, updatedAt, createdAt",
      backups: "id, createdAt",
      scenes: "id, shootDayId, shootOrderNumber, createdAt, ownerUserId",
      transitions: "id, shootDayId, afterSceneId, createdAt, updatedAt",
      users: "id",
      itemImages: "id, itemId, createdAt",
    });
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

export function setCurrentUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId == null) localStorage.removeItem(CURRENT_USER_ID_KEY);
  else localStorage.setItem(CURRENT_USER_ID_KEY, userId);
}

export async function getUsers(): Promise<User[]> {
  return db.users.toArray();
}

export async function putUser(user: User): Promise<void> {
  await db.users.put(user);
}

export const db = new ProductionBoardDB();

export async function getImagesByItem(itemId: string): Promise<ItemImage[]> {
  return db.itemImages.where("itemId").equals(itemId).sortBy("createdAt");
}

export async function putItemImage(image: ItemImage): Promise<void> {
  await db.itemImages.put(image);
}

export async function deleteItemImage(id: string): Promise<void> {
  await db.itemImages.delete(id);
}

export async function deleteImagesByItem(itemId: string): Promise<void> {
  const imgs = await db.itemImages.where("itemId").equals(itemId).toArray();
  if (!imgs.length) return;
  await db.itemImages.bulkDelete(imgs.map((i) => i.id));
}

export async function getProjects(ownerUserId?: string | null): Promise<Project[]> {
  let projects = await db.projects.toArray();
  if (ownerUserId == null || ownerUserId === "") {
    return [];
  }
  projects = projects.filter((p) => (p.ownerUserId ?? "") === ownerUserId);
  projects.sort((a, b) => {
    const ai =
      typeof (a as Project & { projectOrderIndex?: number }).projectOrderIndex ===
      "number"
        ? (a as Project & { projectOrderIndex?: number }).projectOrderIndex
        : undefined;
    const bi =
      typeof (b as Project & { projectOrderIndex?: number }).projectOrderIndex ===
      "number"
        ? (b as Project & { projectOrderIndex?: number }).projectOrderIndex
        : undefined;
    const aHas = ai !== undefined;
    const bHas = bi !== undefined;
    if (aHas && bHas && ai !== bi) return (ai as number) - (bi as number);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    const ad = (a.createdAt as string) ?? "";
    const bd = (b.createdAt as string) ?? "";
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    return a.id.localeCompare(b.id);
  });

  // One-time migration: assign projectOrderIndex 1..N when missing or out of sync
  const needsIndex = projects.some(
    (p, index) =>
      (p as Project & { projectOrderIndex?: number }).projectOrderIndex !==
      index + 1
  );
  if (needsIndex) {
    await db.transaction("rw", db.projects, async () => {
      for (let i = 0; i < projects.length; i += 1) {
        const desired = i + 1;
        const p = projects[i] as Project & { projectOrderIndex?: number };
        if (p.projectOrderIndex !== desired) {
          await db.projects.update(p.id, {
            projectOrderIndex: desired,
          });
          p.projectOrderIndex = desired;
        }
      }
    });
  }

  return projects;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function putProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

export async function deleteProject(id: string): Promise<void> {
  const dayIds = await db.shootDays.where("projectId").equals(id).primaryKeys();
  await db.transaction("rw", db.transitions, db.items, db.scenes, db.itemImages, async () => {
    for (const dayId of dayIds) {
      const itemIds = await db.items.where("shootDayId").equals(dayId).primaryKeys();
      if (itemIds.length) {
        await db.itemImages.where("itemId").anyOf(itemIds as string[]).delete();
      }
      await db.transitions.where("shootDayId").equals(dayId).delete();
      await db.items.where("shootDayId").equals(dayId).delete();
      await db.scenes.where("shootDayId").equals(dayId).delete();
    }
  });
  await db.transaction("rw", db.shootDays, db.projects, async () => {
    await db.shootDays.where("projectId").equals(id).delete();
    await db.projects.delete(id);
  });
}

export async function getShootDaysByProject(projectId: string): Promise<ShootDay[]> {
  const days = await db.shootDays.where("projectId").equals(projectId).toArray();
  days.sort((a, b) => {
    const ai = typeof a.shootOrderIndex === "number" ? a.shootOrderIndex : undefined;
    const bi = typeof b.shootOrderIndex === "number" ? b.shootOrderIndex : undefined;
    const aHas = ai !== undefined;
    const bHas = bi !== undefined;
    if (aHas && bHas && ai !== bi) return (ai as number) - (bi as number);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    // Fallback: original sort by date when both indices are undefined or equal
    const ad = a.date ?? "";
    const bd = b.date ?? "";
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    return a.id.localeCompare(b.id);
  });
  return days;
}

export async function getShootDay(id: string): Promise<ShootDay | undefined> {
  return db.shootDays.get(id);
}

export async function putShootDay(shootDay: ShootDay): Promise<void> {
  await db.shootDays.put(shootDay);
}

export async function deleteShootDay(id: string): Promise<void> {
  await db.transaction("rw", db.transitions, db.items, db.scenes, db.itemImages, async () => {
    const itemIds = await db.items.where("shootDayId").equals(id).primaryKeys();
    if (itemIds.length) {
      await db.itemImages.where("itemId").anyOf(itemIds as string[]).delete();
    }
    await db.transitions.where("shootDayId").equals(id).delete();
    await db.items.where("shootDayId").equals(id).delete();
    await db.scenes.where("shootDayId").equals(id).delete();
  });
  await db.shootDays.delete(id);
}

export async function getItemsByShootDay(shootDayId: string): Promise<ItemRecord[]> {
  return db.items.where("shootDayId").equals(shootDayId).toArray();
}

export async function getItemsBySceneId(sceneId: string): Promise<ItemRecord[]> {
  return db.items.where("sceneId").equals(sceneId).toArray();
}

export async function getItem(id: string): Promise<ItemRecord | undefined> {
  return db.items.get(id);
}

export async function putItem(item: ItemRecord): Promise<void> {
  await db.items.put(item);
}

export async function deleteItem(id: string): Promise<void> {
  await db.transaction("rw", db.items, db.itemImages, async () => {
    await db.itemImages.where("itemId").equals(id).delete();
    await db.items.delete(id);
  });
}

export async function isDbEmpty(): Promise<boolean> {
  const count = await db.projects.count();
  return count === 0;
}

export async function listBackups(): Promise<BackupRecord[]> {
  return db.backups.orderBy("createdAt").reverse().toArray();
}

export async function putBackup(record: BackupRecord): Promise<void> {
  await db.backups.put(record);
}

export async function deleteBackup(id: string): Promise<void> {
  await db.backups.delete(id);
}

export async function getScenesByShootDay(shootDayId: string): Promise<Scene[]> {
  return db.scenes.where("shootDayId").equals(shootDayId).sortBy("shootOrderNumber");
}

export async function getScene(id: string): Promise<Scene | undefined> {
  return db.scenes.get(id);
}

export async function putScene(scene: Scene): Promise<void> {
  await db.scenes.put(scene);
}

export async function getTransitionsByShootDay(shootDayId: string): Promise<Transition[]> {
  return db.transitions.where("shootDayId").equals(shootDayId).toArray();
}

export async function getTransition(id: string): Promise<Transition | undefined> {
  return db.transitions.get(id);
}

export async function getTransitionAfterScene(shootDayId: string, afterSceneId: string): Promise<Transition | undefined> {
  const list = await db.transitions.where("shootDayId").equals(shootDayId).filter((t) => t.afterSceneId === afterSceneId).limit(1).toArray();
  return list[0];
}

export async function putTransition(transition: Transition): Promise<void> {
  await db.transitions.put(transition);
}

export async function deleteTransition(id: string): Promise<void> {
  await db.transitions.delete(id);
}

export async function deleteScene(id: string): Promise<void> {
  await db.transaction("rw", db.scenes, db.items, db.transitions, db.itemImages, async () => {
    const itemIds = await db.items.where("sceneId").equals(id).primaryKeys();
    if (itemIds.length) {
      await db.itemImages.where("itemId").anyOf(itemIds as string[]).delete();
    }
    await db.transitions.where("afterSceneId").equals(id).delete();
    await db.items.where("sceneId").equals(id).delete();
    await db.scenes.delete(id);
  });
}
