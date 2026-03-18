"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectPdfSnapshot } from "@/lib/reports/pdfSnapshotTypes";
import { renderProjectHtml } from "@/lib/reports/renderProjectHtml";
import { toPng } from "html-to-image";

function extractStyleAndBody(reportHtml: string): {
  styleCss: string;
  bodyHtml: string;
} {
  const styleStart = reportHtml.indexOf("<style>");
  const styleEnd = reportHtml.indexOf("</style>", styleStart);
  const styleCss =
    styleStart !== -1 && styleEnd !== -1
      ? reportHtml.slice(styleStart + "<style>".length, styleEnd)
      : "";

  const bodyStart = reportHtml.indexOf("<body>");
  const bodyEnd = reportHtml.indexOf("</body>", bodyStart);
  const bodyHtml =
    bodyStart !== -1 && bodyEnd !== -1
      ? reportHtml.slice(bodyStart + "<body>".length, bodyEnd)
      : reportHtml;

  return { styleCss, bodyHtml };
}

export default function ProjectReportPrintPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectPdfSnapshot | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const loadSnapshot = async () => {
      setLoading(true);
      setError(null);
      setSnapshot(null);

      try {
        const res = await fetch(`/api/projects/${projectId}/report-snapshot`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Failed to load report snapshot (${res.status})`);
        }

        const json = (await res.json()) as ProjectPdfSnapshot;
        if (cancelled) return;
        setSnapshot(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        if (cancelled) return;
        setError(msg);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const reportHtml = useMemo(() => {
    if (!snapshot) return null;
    if (typeof window === "undefined") return null;
    const baseUrl = window.location.origin;
    return renderProjectHtml(snapshot, baseUrl);
  }, [snapshot]);

  const { styleCss, bodyHtml } = useMemo(() => {
    if (!reportHtml) return { styleCss: "", bodyHtml: "" };
    return extractStyleAndBody(reportHtml);
  }, [reportHtml]);

  const [savingImage, setSavingImage] = useState(false);

  const handleSaveImage = async () => {
    if (!reportRef.current) return;
    if (savingImage) return;

    setSavingImage(true);

    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = "report.png";
      link.href = dataUrl;
      link.click();
    } catch {
      window.alert("שגיאה בשמירת התמונה");
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <main className="min-h-screen bg-app text-app p-0 overflow-x-hidden">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 max-w-3xl mx-auto">
          <div className="text-sm font-semibold mb-2">שגיאה</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : null}

      {!error ? (
        <div className="no-print flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={() => void handleSaveImage()}
            disabled={loading || savingImage || !reportHtml}
            className="md:hidden print:hidden mr-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {savingImage ? "שומר..." : "שמור כתמונה"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={loading}
          >
            הדפס / שמור PDF
          </button>
        </div>
      ) : null}

      {loading || !reportHtml ? (
        <div className="text-sm text-gray-500">טוען דוח הפקה...</div>
      ) : (
        <>
          {styleCss ? <style dangerouslySetInnerHTML={{ __html: styleCss }} /> : null}
          <div ref={reportRef} dir="rtl" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </>
      )}
    </main>
  );
}

