import { db } from "./db";
import { SectionType, type ItemRecord, type Scene } from "@/types";

const SCENES_MIGRATION_FLAG = "pb-scenes-migrated-v1";

const newId = () => crypto.randomUUID();

async function createDefaultSceneForDay(
  shootDayId: string,
  existingScenes: Scene[]
): Promise<Scene> {
  const now = new Date().toISOString();
  const hasScenes = existingScenes.length > 0;
  const nextOrder =
    existingScenes.length > 0
      ? Math.max(...existingScenes.map((s) => s.shootOrderNumber)) + 1
      : 1;

  const scene: Scene = {
    id: newId(),
    shootDayId,
    shootOrderNumber: nextOrder,
    scriptSceneNumber: undefined,
    name: hasScenes ? "כללי (לא משויך לסצנה)" : "סצנה כללית",
    status: "OK",
    createdAt: now,
    updatedAt: now,
    detailsJson: JSON.stringify({}),
  };

  await db.scenes.put(scene);
  return scene;
}

export async function migrateScenesIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(SCENES_MIGRATION_FLAG)) return;

    const scenesCount = await db.scenes.count();
    if (scenesCount > 0) {
      localStorage.setItem(SCENES_MIGRATION_FLAG, "1");
      return;
    }

    const shootDays = await db.shootDays.toArray();
    for (const day of shootDays) {
      const allItems = await db.items
        .where("shootDayId")
        .equals(day.id)
        .toArray();

      const sceneItems = allItems
        .filter((it) => it.sectionType === SectionType.SCENES)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      let createdScenes: Scene[] = [];

      // Create scenes from legacy SCENES items
      for (let index = 0; index < sceneItems.length; index++) {
        const it = sceneItems[index];
        let sceneNumber: string | undefined;
        try {
          const details = JSON.parse(it.detailsJson) as {
            sceneNumber?: string;
          };
          if (details && typeof details.sceneNumber === "string") {
            sceneNumber = details.sceneNumber;
          }
        } catch {
          sceneNumber = undefined;
        }

        const scene: Scene = {
          id: newId(),
          shootDayId: day.id,
          shootOrderNumber: index + 1,
          scriptSceneNumber: sceneNumber,
          name: it.title || "",
          status: it.status,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
          detailsJson: it.detailsJson,
        };

        await db.scenes.put(scene);
        createdScenes.push(scene);
      }

      // Attach non-scene items to a default scene
      const existingScenes = createdScenes;
      const nonSceneItems: ItemRecord[] = allItems.filter(
        (it) =>
          it.sectionType !== SectionType.SCENES &&
          (it as ItemRecord).sceneId == null
      );

      if (nonSceneItems.length > 0) {
        const scenesForDay = existingScenes;
        const defaultScene = await createDefaultSceneForDay(
          day.id,
          scenesForDay
        );

        for (const item of nonSceneItems) {
          await db.items.put({ ...item, sceneId: defaultScene.id });
        }
      }
    }

    localStorage.setItem(SCENES_MIGRATION_FLAG, "1");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Scene migration failed", err);
  }
}

