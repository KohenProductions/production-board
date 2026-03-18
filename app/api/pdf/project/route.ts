export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { renderProjectHtml } from "@/lib/reports/renderProjectHtml";
import type { ProjectPdfSnapshot } from "@/lib/reports/pdfSnapshotTypes";

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    (process.env.VERCEL_URL ? `${process.env.VERCEL_URL}` : "localhost:3000");
  return `${proto}://${host}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 200) || "report";
}

export async function POST(req: NextRequest) {
  let snapshot: ProjectPdfSnapshot;
  try {
    const body = await req.json();
    snapshot = body as ProjectPdfSnapshot;
    if (!snapshot?.project?.name || !Array.isArray(snapshot.shootDays) || !snapshot.dayData) {
      return NextResponse.json(
        { error: "Invalid snapshot: project, shootDays, and dayData required" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const html = renderProjectHtml(snapshot, baseUrl);

  const browserlessToken = process.env.BROWSERLESS_TOKEN?.trim();
  if (!browserlessToken) {
    console.error("[pdf/project] BROWSERLESS_TOKEN is missing");
    return NextResponse.json({ error: "BROWSERLESS_TOKEN is missing" }, { status: 500 });
  }

  const browserWSEndpoint = `wss://production-sfo.browserless.io?token=${browserlessToken}`;

  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });
    await browser.close();

    const projectPart = sanitizeFilename(snapshot.project.name);
    const filename = `דוח_פרויקט_${projectPart}.pdf`;
    const encodedFilename = encodeURIComponent(filename);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    const message = err instanceof Error ? err.message : "PDF generation failed";
    console.error("[pdf/project]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
