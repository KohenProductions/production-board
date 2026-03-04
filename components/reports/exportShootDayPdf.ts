import React from "react";
import { pdf } from "@react-pdf/renderer";
import * as db from "@/lib/db";
import { ensurePdfFontsRegistered } from "./pdfFonts";
import { ShootDayReport } from "./ShootDayReport";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 200) || "report";
}

export async function exportShootDayPdf(
  shootDayId: string
): Promise<{ blob: Blob; filename: string }> {
  ensurePdfFontsRegistered();

  const shootDay = await db.getShootDay(shootDayId);
  if (!shootDay) throw new Error("Shoot day not found");
  const project = await db.getProject(shootDay.projectId);
  if (!project) throw new Error("Project not found");
  const scenes = await db.getScenesByShootDay(shootDayId);
  const generatedAt = new Date().toISOString();

  const blob = await pdf(
    React.createElement(ShootDayReport, {
      project,
      shootDay,
      scenes,
      generatedAt,
    }) as React.ReactElement
  ).toBlob();

  const projectPart = sanitizeFilename(project.name);
  const dayPart = sanitizeFilename(shootDay.title || shootDay.id);
  const filename = `דוח_יום_צילום_${projectPart}_${dayPart}.pdf`;

  return { blob, filename };
}
