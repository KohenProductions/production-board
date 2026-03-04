import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as db from "@/lib/db";
import { rtl, wrapLines } from "./pdfText";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 18;
const HEADING_SIZE = 14;
const BODY_SIZE = 11;
const SMALL_SIZE = 10;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 200) || "report";
}

export async function generateProjectPdf(
  projectId: string
): Promise<{ blob: Blob; filename: string }> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const [fontRegularRes, fontBoldRes] = await Promise.all([
    fetch(`${base}/fonts/Heebo-Regular.ttf`),
    fetch(`${base}/fonts/Heebo-Bold.ttf`),
  ]);
  if (!fontRegularRes.ok || !fontBoldRes.ok) {
    throw new Error("Failed to load Hebrew fonts. Ensure Heebo-Regular.ttf and Heebo-Bold.ttf are in public/fonts/.");
  }
  const fontRegularBytes = await fontRegularRes.arrayBuffer();
  const fontBoldBytes = await fontBoldRes.arrayBuffer();

  const project = await db.getProject(projectId);
  if (!project) throw new Error("Project not found");
  const shootDays = await db.getShootDaysByProject(projectId);
  const sortedDays = [...shootDays].sort(
    (a, b) => (a.shootOrderIndex ?? 999) - (b.shootOrderIndex ?? 999)
  );
  const scenesByDay: Record<string, Awaited<ReturnType<typeof db.getScenesByShootDay>>> = {};
  for (const day of sortedDays) {
    scenesByDay[day.id] = await db.getScenesByShootDay(day.id);
  }
  const generatedAt = new Date().toISOString();
  const generatedLabel = new Date(generatedAt).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const totalScenes = sortedDays.reduce(
    (sum, d) => sum + (scenesByDay[d.id]?.length ?? 0),
    0
  );

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontRegular = await doc.embedFont(fontRegularBytes);
  const fontBold = await doc.embedFont(fontBoldBytes);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const rightX = () => PAGE_WIDTH - MARGIN;

  function drawLine(
    text: string,
    font: typeof fontRegular,
    size: number,
    bold = false
  ): void {
    const fontToUse = bold ? fontBold : font;
    const visual = rtl(text);
    const w = fontToUse.widthOfTextAtSize(visual, size);
    if (y < MARGIN + LINE_HEIGHT) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(visual, {
      x: rightX() - w,
      y,
      size,
      font: fontToUse,
    });
    y -= LINE_HEIGHT;
  }

  function drawWrapped(text: string, font: typeof fontRegular, size: number): void {
    const maxW = PAGE_WIDTH - 2 * MARGIN;
    const lines = wrapLines(text, font, size, maxW);
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      const w = font.widthOfTextAtSize(line, size);
      page.drawText(line, { x: rightX() - w, y, size, font });
      y -= LINE_HEIGHT;
    }
  }

  // Cover
  drawLine("דוח הפקה – פרויקט", fontBold, TITLE_SIZE, true);
  y -= 8;
  drawLine(project.name, fontBold, TITLE_SIZE, true);
  if (project.clientName) drawLine(project.clientName, fontRegular, BODY_SIZE);
  drawLine("נוצר: " + generatedLabel, fontRegular, SMALL_SIZE);
  y -= 12;
  drawLine("מספר ימי צילום", fontRegular, SMALL_SIZE);
  drawLine(String(sortedDays.length), fontRegular, BODY_SIZE);
  drawLine("סה״כ סצינות", fontRegular, SMALL_SIZE);
  drawLine(String(totalScenes), fontRegular, BODY_SIZE);
  y -= 12;
  drawLine("תוכן עניינים", fontBold, HEADING_SIZE, true);
  y -= 6;
  for (let i = 0; i < sortedDays.length; i += 1) {
    const day = sortedDays[i]!;
    drawLine(
      `${i + 1}. ${day.title || "יום צילום"}${day.date ? " — " + day.date : ""}`,
      fontRegular,
      BODY_SIZE
    );
  }

  // One section per shoot day (new page each)
  for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex += 1) {
    const day = sortedDays[dayIndex]!;
    const scenes = (scenesByDay[day.id] ?? []).slice().sort(
      (a, b) => a.shootOrderNumber - b.shootOrderNumber
    );
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    drawLine(
      `יום צילום ${dayIndex + 1} — ${day.title || "יום צילום"}`,
      fontBold,
      HEADING_SIZE,
      true
    );
    if (day.date) drawLine(day.date, fontRegular, BODY_SIZE);
    if (day.generalNotes?.trim()) {
      drawWrapped(day.generalNotes.trim(), fontRegular, SMALL_SIZE);
    }
    y -= 12;

    for (const scene of scenes) {
      if (y < MARGIN + 6 * LINE_HEIGHT) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      const timeStr =
        (scene.startTime ?? "") +
        (scene.startTime && scene.endTime ? "–" : "") +
        (scene.endTime ?? "");
      const titleLine =
        "סצנה " + scene.shootOrderNumber + (scene.name ? " — " + scene.name : "");
      drawLine(titleLine, fontBold, BODY_SIZE, true);
      if (timeStr) drawLine(timeStr, fontRegular, SMALL_SIZE);
      if (scene.scriptSceneNumber) {
        drawLine("סצינת תסריט: " + scene.scriptSceneNumber, fontRegular, SMALL_SIZE);
      }
      if (scene.description?.trim()) {
        drawWrapped(scene.description.trim(), fontRegular, SMALL_SIZE);
      }
      y -= 10;
    }
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const filename = `דוח_פרויקט_${sanitizeFilename(project.name)}.pdf`;
  return { blob, filename };
}
