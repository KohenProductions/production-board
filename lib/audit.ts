import * as db from "./db";
import { getBackups } from "./autoBackup";

const MAX_BACKUPS = 10;

export interface AuditReport {
  projects: number;
  shootDays: number;
  scenes: number;
  items: number;
  transitions: number;
  backups: number;
  backupRetentionOk: boolean;
  orphanItemsByScene: string[];
  orphanItemsByShootDay: string[];
  orphanScenesByShootDay: string[];
  orphanTransitions: string[];
}

export async function runAudit(): Promise<AuditReport> {
  const [projects, shootDays, scenes, items, transitions, backups] = await Promise.all([
    db.getProjects(),
    db.db.shootDays.toArray(),
    db.db.scenes.toArray(),
    db.db.items.toArray(),
    db.db.transitions.toArray(),
    getBackups(),
  ]);

  const shootDayIds = new Set(shootDays.map((d) => d.id));
  const sceneIds = new Set(scenes.map((s) => s.id));
  const scenesByShootDay = new Map<string, Set<string>>();
  for (const s of scenes) {
    let set = scenesByShootDay.get(s.shootDayId);
    if (!set) {
      set = new Set();
      scenesByShootDay.set(s.shootDayId, set);
    }
    set.add(s.id);
  }

  const orphanItemsByScene: string[] = [];
  const orphanItemsByShootDay: string[] = [];
  const orphanScenesByShootDay: string[] = [];
  const orphanTransitions: string[] = [];

  for (const item of items) {
    if (item.sceneId && !sceneIds.has(item.sceneId)) {
      orphanItemsByScene.push(item.id);
    }
    if (!shootDayIds.has(item.shootDayId)) {
      orphanItemsByShootDay.push(item.id);
    }
  }
  for (const scene of scenes) {
    if (!shootDayIds.has(scene.shootDayId)) {
      orphanScenesByShootDay.push(scene.id);
    }
  }
  for (const t of transitions) {
    if (!shootDayIds.has(t.shootDayId)) {
      orphanTransitions.push(t.id);
    } else {
      const sceneSet = scenesByShootDay.get(t.shootDayId);
      if (!sceneSet?.has(t.afterSceneId)) {
        orphanTransitions.push(t.id);
      }
    }
  }

  return {
    projects: projects.length,
    shootDays: shootDays.length,
    scenes: scenes.length,
    items: items.length,
    transitions: transitions.length,
    backups: backups.length,
    backupRetentionOk: backups.length <= MAX_BACKUPS,
    orphanItemsByScene,
    orphanItemsByShootDay,
    orphanScenesByShootDay,
    orphanTransitions,
  };
}

function logReport(report: AuditReport): void {
  console.log("--- Production Board Audit ---");
  console.log(`✅ projects: ${report.projects}`);
  console.log(`✅ shootDays: ${report.shootDays}`);
  console.log(`✅ scenes: ${report.scenes}`);
  console.log(`✅ items: ${report.items}`);
  console.log(`✅ transitions: ${report.transitions}`);
  if (report.backupRetentionOk) {
    console.log(`✅ backups: ${report.backups} (≤${MAX_BACKUPS})`);
  } else {
    console.log(`⚠️ backups: ${report.backups} (expected ≤${MAX_BACKUPS})`);
  }
  if (report.orphanItemsByScene.length > 0) {
    console.log(`⚠️ orphan items (missing scene): ${report.orphanItemsByScene.length} [${report.orphanItemsByScene.slice(0, 5).join(", ")}${report.orphanItemsByScene.length > 5 ? "…" : ""}]`);
  } else {
    console.log("✅ no orphan items by scene");
  }
  if (report.orphanItemsByShootDay.length > 0) {
    console.log(`⚠️ orphan items (missing shoot day): ${report.orphanItemsByShootDay.length}`);
  } else {
    console.log("✅ no orphan items by shoot day");
  }
  if (report.orphanScenesByShootDay.length > 0) {
    console.log(`⚠️ orphan scenes (missing shoot day): ${report.orphanScenesByShootDay.length}`);
  } else {
    console.log("✅ no orphan scenes by shoot day");
  }
  if (report.orphanTransitions.length > 0) {
    console.log(`⚠️ orphan transitions (missing scene in shoot day): ${report.orphanTransitions.length}`);
  } else {
    console.log("✅ no orphan transitions");
  }
  console.log("--- end audit ---");
}

export async function runAuditAndLog(): Promise<AuditReport> {
  const report = await runAudit();
  logReport(report);
  return report;
}
