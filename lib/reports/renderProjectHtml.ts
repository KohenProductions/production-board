import type { ProjectPdfSnapshot, SceneEntityLinkSnapshot } from "./pdfSnapshotTypes";
import { SectionType } from "@/types";

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

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw || "null") as T;
  } catch {
    return null;
  }
}

function formatHebrewDate(isoLike: string, opts?: { withTime?: boolean }): string {
  const raw = safeText(isoLike);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return escapeHtml(raw);

  if (opts?.withTime) {
    const dt = d.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return ltrSpan(dt);
  }

  const dateOnly = d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return ltrSpan(dateOnly);
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

type DashboardItem = {
  key: string;
  title: string;
  status: "OK" | "MISSING" | "BLOCKED";
  subtitle?: string;
};

function normalizeStatusForDashboard(v: unknown): DashboardItem["status"] {
  const s = safeText(v).toUpperCase();
  if (s === "OK") return "OK";
  if (s === "BLOCKED") return "BLOCKED";
  return "MISSING";
}

function statusPill(status: DashboardItem["status"]): string {
  const ok = status === "OK";
  const cls = ok ? "status-dot status-dot-ok" : "status-dot status-dot-bad";
  return `<span class="${cls}" aria-hidden="true"></span>`;
}

function statusTextHe(status: DashboardItem["status"]): string {
  if (status === "OK") return "תקין";
  if (status === "BLOCKED") return "חסום";
  return "חסר";
}

function statusBadge(status: DashboardItem["status"]): string {
  const ok = status === "OK";
  const cls = ok ? "status-badge status-badge-ok" : "status-badge status-badge-bad";
  const icon = ok
    ? `<svg class="status-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.2 6.3l2.2 2.2L9.8 3.2"/></svg>`
    : `<svg class="status-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9"/></svg>`;
  return `<span class="${cls}" aria-hidden="true">${icon}</span>`;
}

function renderEntityTitleWithRole(title: string, role?: string): string {
  const t = safeText(title);
  const r = safeText(role);
  if (!t) return "";
  return r ? `${escapeHtml(t)} — ${escapeHtml(r)}` : escapeHtml(t);
}

/**
 * Returns a full HTML document for the project report (RTL Hebrew).
 * Cover + one section per shoot day with page-break-before.
 */
export function renderProjectHtml(snapshot: ProjectPdfSnapshot, baseUrl: string): string {
  const { project, shootDays, dayData } = snapshot;
  const sortedDays = [...shootDays].sort(
    (a, b) => (a.shootOrderIndex ?? 999) - (b.shootOrderIndex ?? 999)
  );

  const projectCrew = (snapshot.projectEntities ?? [])
    .filter((e) => e.entityType === "CREW")
    .map((e) => ({
      id: e.id,
      title: safeText(e.title),
      status: normalizeStatusForDashboard(e.status),
      role: safeText(parseJsonSafe<{ role?: string; title?: string }>(safeText(e.detailsJson))?.role) ||
        safeText(parseJsonSafe<{ role?: string; title?: string }>(safeText(e.detailsJson))?.title),
    }))
    .filter((e) => e.title)
    .map((e) => ({ ...e, title: escapeHtml(e.title), role: e.role ? escapeHtml(e.role) : "" }));

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

  const daySections = sortedDays.map((day, dayIndex) => {
    const data = dayData[day.id] ?? { scenes: [], items: [], transitions: [] };
    const scenes = [...(data.scenes ?? [])].sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
    const items = data.items ?? [];
    const transitions = data.transitions ?? [];
    const sceneEntityLinks = data.sceneEntityLinks ?? [];

    const itemsByScene = new Map<string, typeof items>();
    for (const item of items) {
      const sid = item.sceneId ?? "";
      if (!itemsByScene.has(sid)) itemsByScene.set(sid, []);
      itemsByScene.get(sid)!.push(item);
    }
    const transitionsByAfterScene = new Map<string, (typeof transitions)[0]>();
    for (const t of transitions) {
      transitionsByAfterScene.set(t.afterSceneId, t);
    }

    const entityLinksByScene = new Map<string, SceneEntityLinkSnapshot[]>();
    for (const link of sceneEntityLinks) {
      if (!entityLinksByScene.has(link.sceneId)) entityLinksByScene.set(link.sceneId, []);
      entityLinksByScene.get(link.sceneId)!.push(link);
    }

    const sceneBlocks = scenes
      .map((scene, sceneIndex) => {
        const sceneItems = itemsByScene.get(scene.id) ?? [];
        const locations = sceneItems.filter((i) => i.sectionType === SectionType.LOCATIONS);
        const talent = sceneItems.filter((i) => i.sectionType === SectionType.TALENT);
        const trans = transitionsByAfterScene.get(scene.id);

        const timeHtml = timeRangeHtml(scene.startTime, scene.endTime);
        const sceneLinks = entityLinksByScene.get(scene.id) ?? [];
        const linkedLocations = sceneLinks
          .filter((l) => l.projectEntity.entityType === "LOCATIONS")
          .map((l) => ({
            title: safeText(l.projectEntity.title),
            status: normalizeStatusForDashboard(l.projectEntity.status),
          }))
          .filter((x) => x.title)
          .map((x) => ({ ...x, title: escapeHtml(x.title) }));

        const linkedTalent = sceneLinks
          .filter((l) => l.projectEntity.entityType === "TALENT")
          .map((l) => ({
            title: safeText(l.projectEntity.title),
            status: normalizeStatusForDashboard(l.projectEntity.status),
          }))
          .filter((x) => x.title)
          .map((x) => ({ ...x, title: escapeHtml(x.title) }));

        const titleLine = `סצנה ${sceneIndex + 1}${scene.name ? ` — ${escapeHtml(scene.name)}` : ""}`;
        const lines: string[] = [];
        lines.push(`    <div class="scene-card">`);
        lines.push(`      <div class="scene-title">${titleLine}</div>`);

        if (timeHtml) {
          lines.push(`      <div class="scene-meta scene-meta-compact">${timeHtml}</div>`);
        }

        const locationItems =
          linkedLocations.length > 0
            ? linkedLocations
            : locations
                .map((l) => ({
                  title: safeText(l.title),
                  status: normalizeStatusForDashboard(l.status),
                }))
                .filter((x) => x.title)
                .map((x) => ({ ...x, title: escapeHtml(x.title) }));

        const locationLine =
          locationItems.length > 0
            ? locationItems
                .map((it) => `${it.title} ${statusBadge(it.status)}`)
                .join(" <span class=\"meta-sep\">|</span> ")
            : `${escapeHtml("לא הוגדר")} ${statusBadge("MISSING")}`;
        lines.push(`      <div class="scene-meta scene-meta-compact">לוקיישן: ${locationLine}</div>`);

        const talentItems =
          linkedTalent.length > 0
            ? linkedTalent
            : talent
                .map((t) => ({
                  title: safeText(t.title),
                  status: normalizeStatusForDashboard(t.status),
                }))
                .filter((x) => x.title)
                .map((x) => ({ ...x, title: escapeHtml(x.title) }));

        if (talentItems.length > 0) {
          const talentLine = talentItems
            .map((it) => `${it.title} ${statusBadge(it.status)}`)
            .join(" <span class=\"meta-sep\">|</span> ");
          lines.push(`      <div class="scene-meta scene-meta-compact">שחקנים: ${talentLine}</div>`);
        }

        if (trans) {
          const transTimeHtml = timeRangeHtml(trans.startTime, trans.endTime);
          const transLine = transTimeHtml
            ? `מעבר: ${escapeHtml(trans.title)} (${transTimeHtml})`
            : `מעבר: ${escapeHtml(trans.title)}`;
          lines.push(`      <div class="scene-meta">${transLine}</div>`);
        }
        if (scene.description?.trim()) {
          lines.push(`      <div class="scene-desc">${escapeHtml(scene.description.trim())}</div>`);
        }
        lines.push(`    </div>`);
        return lines.join("\n");
      })
      .join("\n");

    const dayTitle = `יום צילום ${dayIndex + 1}`;
    const daySectionClass = "day-section";

    return `
  <div class="${daySectionClass}">
    <div class="day-title">${escapeHtml(dayTitle)}</div>
    ${day.date ? `<div class="day-meta">${formatHebrewDate(day.date)}</div>` : ""}
    <div class="section-heading">סצנות</div>
${sceneBlocks}
  </div>`;
  });

  const allLinks = sortedDays.flatMap((d) => dayData[d.id]?.sceneEntityLinks ?? []);
  const dashboardLocationsMap = new Map<string, DashboardItem>();
  const dashboardTalentMap = new Map<string, DashboardItem>();
  const dashboardCrewMap = new Map<string, DashboardItem>();

  for (const link of allLinks) {
    const entity = link.projectEntity;
    const title = safeText(entity.title);
    if (!title) continue;
    const status = normalizeStatusForDashboard(entity.status);

    if (entity.entityType === "LOCATIONS") {
      const key = title.toLowerCase();
      const existing = dashboardLocationsMap.get(key);
      if (!existing || (existing.status === "OK" && status !== "OK")) {
        dashboardLocationsMap.set(key, { key, title, status });
      }
    }

    if (entity.entityType === "TALENT") {
      const details = parseJsonSafe<{ role?: string; fullName?: string }>(safeText(entity.detailsJson)) ?? null;
      const role = safeText(details?.role);
      // Use entity id to avoid collisions between similarly named entities
      const key = entity.id;
      const existing = dashboardTalentMap.get(key);
      if (!existing || (existing.status === "OK" && status !== "OK")) {
        dashboardTalentMap.set(key, { key, title, status, subtitle: role || undefined });
      }
    }

    if (entity.entityType === "CREW") {
      const details = parseJsonSafe<{ role?: string; title?: string }>(safeText(entity.detailsJson)) ?? null;
      const role = safeText(details?.role || details?.title);
      // Use entity id to avoid collisions between similarly named entities
      const key = entity.id;
      const existing = dashboardCrewMap.get(key);
      if (!existing || (existing.status === "OK" && status !== "OK")) {
        dashboardCrewMap.set(key, { key, title, status, subtitle: role || undefined });
      }
    }
  }

  // Fallback for crew: project-wide crew entities (not necessarily linked to scenes)
  if (dashboardCrewMap.size === 0 && projectCrew.length > 0) {
    for (const c of projectCrew) {
      dashboardCrewMap.set(c.id, {
        key: c.id,
        title: safeText(c.title),
        status: c.status,
        subtitle: c.role ? safeText(c.role) : undefined,
      });
    }
  }

  // Fallback: if links are missing, try derive from ItemRecord (older snapshots)
  if (dashboardLocationsMap.size === 0 && dashboardTalentMap.size === 0 && dashboardCrewMap.size === 0) {
    const allItems = sortedDays.flatMap((d) => dayData[d.id]?.items ?? []);
    for (const item of allItems) {
      const title = safeText(item.title);
      if (!title) continue;
      const status = normalizeStatusForDashboard(item.status);

      if (item.sectionType === SectionType.LOCATIONS) {
        const key = title.toLowerCase();
        const existing = dashboardLocationsMap.get(key);
        if (!existing || (existing.status === "OK" && status !== "OK")) {
          dashboardLocationsMap.set(key, { key, title, status });
        }
      }

      if (item.sectionType === SectionType.TALENT) {
        const details = parseJsonSafe<{ role?: string; fullName?: string }>(safeText(item.detailsJson)) ?? null;
        const role = safeText(details?.role);
        const key = `${title.toLowerCase()}|${role.toLowerCase()}`;
        const existing = dashboardTalentMap.get(key);
        if (!existing || (existing.status === "OK" && status !== "OK")) {
          dashboardTalentMap.set(key, { key, title, status, subtitle: role || undefined });
        }
      }

      if (item.sectionType === SectionType.CONTACTS) {
        const details = parseJsonSafe<{ role?: string; name?: string }>(safeText(item.detailsJson)) ?? null;
        const role = safeText(details?.role);
        const key = `${title.toLowerCase()}|${role.toLowerCase()}`;
        const existing = dashboardCrewMap.get(key);
        if (!existing || (existing.status === "OK" && status !== "OK")) {
          dashboardCrewMap.set(key, { key, title, status, subtitle: role || undefined });
        }
      }
    }
  }

  const dashboardLocations = Array.from(dashboardLocationsMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "he")
  );
  const dashboardTalent = Array.from(dashboardTalentMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "he")
  );
  const dashboardCrew = Array.from(dashboardCrewMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "he")
  );

  const dashboardListHtml = (items: DashboardItem[], emptyText: string) => {
    if (items.length === 0) return `<div class="dash-empty">${escapeHtml(emptyText)}</div>`;
    const chips = items
      .map((it) => {
        const text = renderEntityTitleWithRole(it.title, it.subtitle);
        return `<span class="chip-item">${text}</span>`;
      })
      .join("\n");
    return `<div class="chip-wrap">${chips}</div>`;
  };

  const dashboardHtml = `
  <div class="dashboard-page">
    <div class="dashboard-title">דוח הפקה - ${escapeHtml(project.name)}</div>
    <div class="dashboard-stack">
      <div class="dash-section">
        <div class="dash-heading">לוקיישנים</div>
        ${dashboardListHtml(dashboardLocations, "לא נמצאו לוקיישנים")}
      </div>
      <div class="dash-section">
        <div class="dash-heading">שחקנים</div>
        ${dashboardListHtml(dashboardTalent, "לא נמצאו שחקנים")}
      </div>
      <div class="dash-section">
        <div class="dash-heading">אנשי צוות</div>
        ${dashboardListHtml(dashboardCrew, "לא נמצאו אנשי צוות")}
      </div>
    </div>
  </div>`;

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
      color: #0f172a;
      margin: 0;
      padding: 12mm;
      direction: rtl;
      background: #f7f6f2;
    }
    .dashboard-page { page-break-after: always; padding-top: 6mm; }
    .dashboard-title {
      font-size: 16pt;
      font-weight: 700;
      text-align: center;
      margin: 0 0 5mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }
    .dashboard-stack { display: flex; flex-direction: column; gap: 4mm; }
    .dash-section { border: 1px solid #e7e5e4; border-radius: 10px; padding: 4mm 5mm; background: #ffffff; box-shadow: 0 1px 0 rgba(15,23,42,0.04); }
    .dash-heading { font-size: 11.5pt; font-weight: 700; margin: 0 0 2.5mm; }
    .dash-empty { font-size: 9.5pt; color: #777; }
    .chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid #e7e5e4;
      background: #fafaf9;
      font-size: 10pt;
      line-height: 1.1;
      white-space: nowrap;
    }

    /* Status badges are used ONLY inside scene blocks (not page 1). */
    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      width: 14px;
      height: 14px;
      vertical-align: -2px;
      margin-inline-start: 2px;
    }
    .status-icon { width: 10px; height: 10px; color: #fff; }
    .status-badge-ok { background: #22c55e; }
    .status-badge-bad { background: #ef4444; }

    .day-section { page-break-before: always; padding-top: 8px; }
    .day-title { font-size: 16pt; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.01em; }
    .day-meta { font-size: 11pt; color: #475569; margin-bottom: 10px; }
    .section-heading { font-size: 12pt; font-weight: 700; margin: 14px 0 8px; color: #0f172a; }
    .scene-card {
      break-inside: auto;
      page-break-inside: auto;
      border: 1px solid #e7e5e4;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 12px;
      background: #ffffff;
      box-shadow: 0 1px 0 rgba(15,23,42,0.04);
    }
    .scene-title { font-weight: 700; font-size: 12.5pt; margin-bottom: 4px; break-inside: avoid; page-break-inside: avoid; letter-spacing: -0.01em; }
    .scene-meta { font-size: 10pt; color: #334155; margin: 2px 0; }
    .scene-meta-compact { color: #475569; }
    .meta-sep { color: #cbd5e1; }
    .scene-desc { font-size: 10pt; margin-top: 6px; color: #475569; white-space: pre-wrap; }
  </style>
</head>
<body>
${dashboardHtml}
${daySections.join("")}
</body>
</html>`;
  return html;
}
