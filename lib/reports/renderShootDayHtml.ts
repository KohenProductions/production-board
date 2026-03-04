import type { ShootDayPdfSnapshot } from "./pdfSnapshotTypes";
import { SectionType, type ItemRecord } from "@/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ltrSpan(text: string): string {
  return `<span dir="ltr" class="ltr">${escapeHtml(text)}</span>`;
}

function timeRangeHtml(start?: string, end?: string): string {
  const s = start ?? "";
  const e = end ?? "";
  if (s && e) return `${ltrSpan(s)}–${ltrSpan(e)}`;
  if (s) return ltrSpan(s);
  if (e) return ltrSpan(e);
  return "";
}

function safeText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function isOkStatus(v: any): boolean {
  if (v === true) return true;
  const s = safeText(v).toLowerCase();
  if (!s) return false;
  return (
    s === "ok" ||
    s === "green" ||
    s === "yes" ||
    s === "true" ||
    s === "confirmed" ||
    s === "ready" ||
    s === "done"
  );
}

function resolveLocation(scene: any): { name: string; ok: boolean } {
  const name =
    safeText(scene?.location?.name) ||
    safeText(scene?.locationName) ||
    safeText(scene?.location) ||
    safeText(scene?.place) ||
    "";

  const explicit =
    scene?.location?.status ??
    scene?.locationStatus ??
    scene?.locationOk ??
    scene?.isLocationOk;

  const ok = explicit !== undefined ? isOkStatus(explicit) : Boolean(name);
  return { name, ok };
}

function resolveTalent(scene: any): Array<{ name: string; ok: boolean }> {
  const list =
    scene?.talent ||
    scene?.talents ||
    scene?.actors ||
    scene?.people ||
    [];

  if (Array.isArray(list) && list.length > 0) {
    return list
      .map((t: any) => {
        const name = safeText(t?.name ?? t?.fullName ?? t);
        const explicit = t?.status ?? t?.ok ?? t?.isOk ?? t?.confirmed;
        const ok = explicit !== undefined ? isOkStatus(explicit) : Boolean(name);
        return { name, ok };
      })
      .filter((x) => x.name);
  }

  const str =
    safeText(scene?.talentNames) ||
    safeText(scene?.talentText) ||
    safeText(scene?.actorsText) ||
    "";

  if (!str) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, ok: true }));
}

function chip(label: string, ok: boolean): string {
  const cls = ok ? "chip chip-ok" : "chip chip-missing";
  const text = ok ? "OK" : "חסר";
  return `<span class="${cls}"><span class="chip-dot"></span>${label}: ${text}</span>`;
}

/**
 * Returns a full HTML document for the shoot day report (RTL Hebrew).
 * Use baseUrl for font and asset URLs (e.g. from request headers on the server).
 */
export function renderShootDayHtml(snapshot: ShootDayPdfSnapshot, baseUrl: string): string {
  const { project, shootDay, scenes, items, transitions } = snapshot;
  const sortedScenes = [...scenes].sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
  const generatedAt = new Date().toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const fontCss = `
  @font-face {
    font-family: 'Heebo';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('${baseUrl}/fonts/Heebo-Regular.ttf') format('truetype');
  }
  @font-face {
    font-family: 'Heebo';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('${baseUrl}/fonts/Heebo-Bold.ttf') format('truetype');
  }
  `;

  const itemsByScene = new Map<string, ItemRecord[]>();
  for (const item of items) {
    const sid = item.sceneId ?? "";
    if (!itemsByScene.has(sid)) itemsByScene.set(sid, []);
    itemsByScene.get(sid)!.push(item);
  }
  const transitionsByAfterScene = new Map<string, (typeof transitions)[0]>();
  for (const t of transitions) {
    transitionsByAfterScene.set(t.afterSceneId, t);
  }

  const sceneBlocks = sortedScenes
    .map((scene) => {
      const start = (scene as any).startTime || (scene as any).start || "";
      const end = (scene as any).endTime || (scene as any).end || "";
      const timeRange = start && end ? `${start}–${end}` : start ? `${start}` : end ? `${end}` : "—";
      const sceneItems = itemsByScene.get(scene.id) ?? [];
      const locations = sceneItems.filter((i) => i.sectionType === SectionType.LOCATIONS);
      const talent = sceneItems.filter((i) => i.sectionType === SectionType.TALENT);
      const trans = transitionsByAfterScene.get(scene.id);
      const timeStr = timeRange;
      const sceneView: any = {
        location: locations[0] ? { name: locations[0].title, status: locations[0].status } : {},
        locationName: locations[0]?.title ?? "",
        locationStatus: locations[0]?.status,
        talent: talent.map((t) => ({ name: t.title, status: t.status })),
      };
      const loc = resolveLocation(sceneView);
      const talents = resolveTalent(sceneView);
      const titleLine = `סצנה ${scene.shootOrderNumber}${scene.name ? ` — ${escapeHtml(scene.name)}` : ""}`;
      const timeHtml = timeRangeHtml(scene.startTime, scene.endTime);
      const lines: string[] = [];
      lines.push(`<div class="scene-card">`);
      lines.push(`  <div class="scene-title">${titleLine}</div>`);
      if (timeHtml) {
        lines.push(`  <div class="scene-meta">${timeHtml}</div>`);
      }
      if (locations.length) {
        const locList = locations.map((l) => escapeHtml(l.title || "")).filter(Boolean).join("، ");
        if (locList) lines.push(`  <div class="scene-meta"><strong>לוקיישנים:</strong> ${locList}</div>`);
      }
      if (talent.length) {
        const talentList = talent.map((t) => escapeHtml(t.title || "")).filter(Boolean).join("، ");
        if (talentList) lines.push(`  <div class="scene-meta"><strong>שחקנים/טלנט:</strong> ${talentList}</div>`);
      }
      const chipParts: string[] = [];
      chipParts.push(chip("לוקיישן", loc.ok));
      for (const t of talents) chipParts.push(chip(escapeHtml(t.name), t.ok));
      lines.push(`  <div class="chips">${chipParts.join("")}</div>`);
      if (scene.scriptSceneNumber) {
        lines.push(`  <div class="scene-meta">סצינת תסריט: ${escapeHtml(scene.scriptSceneNumber)}</div>`);
      }
      if (trans) {
        const transTimeHtml = timeRangeHtml(trans.startTime, trans.endTime);
        const transLine = transTimeHtml
          ? `מעבר: ${escapeHtml(trans.title)} (${transTimeHtml})`
          : `מעבר: ${escapeHtml(trans.title)}`;
        lines.push(`  <div class="scene-meta">${transLine}</div>`);
      }
      if (scene.description?.trim()) {
        lines.push(`  <div class="scene-desc">${escapeHtml(scene.description.trim())}</div>`);
      }
      lines.push(`</div>`);
      return lines.join("\n");
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${fontCss}
    * { box-sizing: border-box; }
    body {
      font-family: 'Heebo', sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 12mm;
      direction: rtl;
    }
    .report-title { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
    .report-meta { font-size: 11pt; color: #444; margin-bottom: 8px; }
    .section-heading { font-size: 14pt; font-weight: 700; margin: 16px 0 8px; }
    .scene-card {
      break-inside: auto;
      page-break-inside: auto;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 12px;
      background: #fafafa;
    }
    .scene-title { font-weight: 700; font-size: 12pt; margin-bottom: 4px; break-inside: avoid; page-break-inside: avoid; }
    .scene-meta { font-size: 10pt; color: #333; margin: 2px 0; }
    .scene-desc { font-size: 10pt; margin-top: 6px; color: #555; white-space: pre-wrap; }
    .notes-block { margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 11pt; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; font-size: 12px; border: 1px solid rgba(0,0,0,0.08); }
    .chip-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
    .chip-ok { background: rgba(34,197,94,0.10); color: #166534; border-color: rgba(34,197,94,0.25); }
    .chip-ok .chip-dot { background: #22c55e; }
    .chip-missing { background: rgba(239,68,68,0.10); color: #7f1d1d; border-color: rgba(239,68,68,0.25); }
    .chip-missing .chip-dot { background: #ef4444; }
  </style>
</head>
<body>
  <div class="report-title">${escapeHtml(project.name)}</div>
  ${project.clientName ? `<div class="report-meta">${escapeHtml(project.clientName)}</div>` : ""}
  <div class="report-meta">${escapeHtml(shootDay.title || "יום צילום")}${shootDay.date ? ` · ${ltrSpan(shootDay.date)}` : ""}</div>
  <div class="report-meta">נוצר: ${ltrSpan(generatedAt)}</div>
  <div class="report-meta">סה״כ סצנות: ${ltrSpan(String(sortedScenes.length))}</div>
  ${shootDay.generalNotes?.trim() ? `<div class="notes-block"><strong>הערות כלליות:</strong><br/>${escapeHtml(shootDay.generalNotes.trim())}</div>` : ""}
  <div class="section-heading">סצנות</div>
  ${sceneBlocks}
</body>
</html>`;
  return html;
}
