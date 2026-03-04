import React from "react";
import { pdf } from "@react-pdf/renderer";
import * as db from "@/lib/db";
import { ensurePdfFontsRegistered } from "./pdfFonts";
import { ProjectReport } from "./ProjectReport";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 200) || "report";
}

export async function exportProjectPdf(
  projectId: string
): Promise<{ blob: Blob; filename: string }> {
  ensurePdfFontsRegistered();

  const project = await db.getProject(projectId);
  if (!project) throw new Error("Project not found");
  const shootDays = await db.getShootDaysByProject(projectId);
  const scenesByDay: Record<string, import("@/types").Scene[]> = {};
  for (const day of shootDays) {
    scenesByDay[day.id] = await db.getScenesByShootDay(day.id);
  }
  const generatedAt = new Date().toISOString();

  const blob = await pdf(
    React.createElement(ProjectReport, {
      project,
      shootDays,
      scenesByDay,
      generatedAt,
    }) as React.ReactElement
  ).toBlob();

  const filename = `דוח_פרויקט_${sanitizeFilename(project.name)}.pdf`;
  return { blob, filename };
}
