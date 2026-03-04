import type { ItemRecord, ShootDay, Scene, Transition } from "@/types";
import { SectionType, SECTION_LABELS } from "@/types";

const STATUS_SYMBOLS = { OK: "✅", MISSING: "❌", BLOCKED: "⛔" } as const;

function sceneTimePrefix(scene: Scene): string {
  const s = scene.startTime;
  const e = scene.endTime;
  if (s && e) return `${s}–${e} | `;
  if (s) return `${s} | `;
  if (e) return `${e} | `;
  return "";
}

function transitionLine(t: Transition): string {
  const s = t.startTime;
  const e = t.endTime;
  const timePart = s && e ? ` ${s}–${e}` : s ? ` ${s}` : e ? ` ${e}` : "";
  const notesPart = t.notes?.trim() ? ` — ${t.notes.trim()}` : "";
  return `${t.title}${timePart}${notesPart}`;
}

export function buildWhatsAppSummary(
  shootDay: ShootDay,
  scenes: Scene[],
  items: ItemRecord[],
  transitions: Transition[] = []
): string {
  const lines: string[] = [];
  lines.push(`סיכום: יום צילום ${shootDay.date || shootDay.title}`);
  lines.push("");

  const sortedScenes = [...scenes].sort(
    (a, b) => a.shootOrderNumber - b.shootOrderNumber
  );
  const transitionByAfter = new Map<string, Transition>();
  for (const t of transitions) transitionByAfter.set(t.afterSceneId, t);

  for (const scene of sortedScenes) {
    const headerParts: string[] = [];
    headerParts.push(sceneTimePrefix(scene));
    headerParts.push(`סצנה ${scene.shootOrderNumber}`);
    if (scene.name) {
      headerParts.push(`— ${scene.name}`);
    }
    if (scene.scriptSceneNumber) {
      headerParts.push(`| סצנת תסריט: ${scene.scriptSceneNumber}`);
    }
    lines.push(headerParts.join(" ").trim());

    const sceneItems = items.filter((it) => it.sceneId === scene.id);
    const bySection = new Map<SectionType, ItemRecord[]>();
    for (const item of sceneItems) {
      const list = bySection.get(item.sectionType) ?? [];
      list.push(item);
      bySection.set(item.sectionType, list);
    }

    // For shoot day export we only show locations and talent summaries.
    const sectionOrder: SectionType[] = [
      SectionType.LOCATIONS,
      SectionType.TALENT,
    ];

    for (const sectionType of sectionOrder) {
      const sectionItems = bySection.get(sectionType);
      if (!sectionItems?.length) continue;
      lines.push(`- ${SECTION_LABELS[sectionType]}:`);
      const byStatus = {
        OK: [] as ItemRecord[],
        MISSING: [] as ItemRecord[],
        BLOCKED: [] as ItemRecord[],
      };
      for (const it of sectionItems) {
        byStatus[it.status].push(it);
      }
      for (const status of ["OK", "MISSING", "BLOCKED"] as const) {
        for (const it of byStatus[status]) {
          lines.push(`  ${STATUS_SYMBOLS[status]} ${it.title}`);
        }
      }
    }

    const trans = transitionByAfter.get(scene.id);
    if (trans) {
      lines.push(transitionLine(trans));
    }

    lines.push("");
  }

  if (shootDay.generalNotes) {
    lines.push("הערות כלליות:");
    lines.push(shootDay.generalNotes);
  }

  return lines.join("\n").trim();
}

/** Export summary for a single scene (for scene page "ייצוא סטטוס לסצנה"). */
export function buildSceneWhatsAppSummary(
  scene: {
    shootOrderNumber: number;
    name?: string;
    scriptSceneNumber?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
  },
  items: ItemRecord[]
): string {
  const lines: string[] = [];
  const timePrefix =
    scene.startTime && scene.endTime
      ? `${scene.startTime}–${scene.endTime} | `
      : scene.startTime
      ? `${scene.startTime} | `
      : scene.endTime
      ? `${scene.endTime} | `
      : "";
  const headerParts = [timePrefix, `סצנה ${scene.shootOrderNumber}`];
  if (scene.name) headerParts.push(`(${scene.name})`);
  if (scene.scriptSceneNumber) headerParts.push(`| סצנת תסריט: ${scene.scriptSceneNumber}`);
  lines.push(headerParts.join(" ").trim());
  if (scene.description && scene.description.trim()) {
    lines.push("");
    lines.push(scene.description.trim());
  }
  lines.push("");

  const bySection = new Map<SectionType, ItemRecord[]>();
  for (const item of items) {
    const list = bySection.get(item.sectionType) ?? [];
    list.push(item);
    bySection.set(item.sectionType, list);
  }
  const sectionOrder: SectionType[] = [
    SectionType.LOCATIONS,
    SectionType.TALENT,
    SectionType.SCHEDULE,
    SectionType.ASSETS,
    SectionType.NOTES,
    SectionType.CONTACTS,
  ];
  const STATUS_SYMBOLS = { OK: "✅", MISSING: "❌", BLOCKED: "⛔" } as const;
  for (const sectionType of sectionOrder) {
    const sectionItems = bySection.get(sectionType);
    if (!sectionItems?.length) continue;
    lines.push(`${SECTION_LABELS[sectionType]}:`);
    const byStatus = { OK: [] as ItemRecord[], MISSING: [] as ItemRecord[], BLOCKED: [] as ItemRecord[] };
    for (const it of sectionItems) byStatus[it.status].push(it);
    for (const status of ["OK", "MISSING", "BLOCKED"] as const) {
      for (const it of byStatus[status]) lines.push(`${STATUS_SYMBOLS[status]} ${it.title}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
