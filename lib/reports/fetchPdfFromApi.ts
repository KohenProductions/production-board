/**
 * Client-side: POST snapshot to PDF API and return blob + filename for download.
 */
import type { ShootDayPdfSnapshot, ProjectPdfSnapshot } from "./pdfSnapshotTypes";

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // fallback to ascii filename
    }
  }
  const asciiMatch = header.match(/filename="([^"]+)"/);
  if (asciiMatch) return asciiMatch[1].trim();
  return null;
}

export async function fetchShootDayPdf(snapshot: ShootDayPdfSnapshot): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch("/api/pdf/shoot-day", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "PDF export failed");
  }
  const blob = await res.blob();
  const filename =
    parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    "shoot_day_report.pdf";
  return { blob, filename };
}

export async function fetchProjectPdf(snapshot: ProjectPdfSnapshot): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch("/api/pdf/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "PDF export failed");
  }
  const blob = await res.blob();
  const filename =
    parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    "project_report.pdf";
  return { blob, filename };
}
