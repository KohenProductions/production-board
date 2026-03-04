import { db, getCurrentUserId, setCurrentUserId } from "./db";
import type { Project, ShootDay, Scene, User } from "@/types";

const USER_MIGRATION_FLAG = "pb-owner-user-id-migrated-v1";

function newId() {
  return crypto.randomUUID();
}

export async function migrateOwnerUserIdIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(USER_MIGRATION_FLAG)) return;

    const projects = await db.projects.toArray();
    const hasUnassigned = projects.some((p) => p.ownerUserId == null || p.ownerUserId === "");
    const usersCount = await db.users.count();

    if (!hasUnassigned && usersCount > 0) {
      localStorage.setItem(USER_MIGRATION_FLAG, "1");
      return;
    }

    let defaultUser: User;
    const existingUsers = await db.users.toArray();
    if (existingUsers.length > 0) {
      defaultUser = existingUsers[0];
    } else {
      defaultUser = {
        id: newId(),
        displayName: "משתמש ברירת מחדל",
      };
      await db.users.put(defaultUser);
    }

    const uid = defaultUser.id;

    await db.transaction("rw", db.projects, db.shootDays, db.scenes, async () => {
      for (const p of projects) {
        if (p.ownerUserId == null || p.ownerUserId === "") {
          await db.projects.update(p.id, { ownerUserId: uid });
        }
      }
      const days = await db.shootDays.toArray();
      for (const d of days) {
        if (d.ownerUserId == null || d.ownerUserId === "") {
          await db.shootDays.update(d.id, { ownerUserId: uid });
        }
      }
      const allScenes = await db.scenes.toArray();
      for (const s of allScenes) {
        if (s.ownerUserId == null || s.ownerUserId === "") {
          await db.scenes.update(s.id, { ownerUserId: uid });
        }
      }
    });

    if (!getCurrentUserId()) {
      setCurrentUserId(uid);
    }
    localStorage.setItem(USER_MIGRATION_FLAG, "1");
  } catch (err) {
    console.error("Owner user id migration failed", err);
  }
}
