"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png";
const MAX_DIMENSION_OPTIONS = [
  { value: 0, label: "Original" },
  { value: 2400, label: "2400" },
  { value: 1600, label: "1600" },
  { value: 1200, label: "1200" },
] as const;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function hasTransparency(img: HTMLImageElement): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(img.naturalWidth, 200);
  canvas.height = Math.min(img.naturalHeight, 200);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(false);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return Promise.resolve(true);
  }
  return Promise.resolve(false);
}

function resizeToLongEdge(
  img: HTMLImageElement,
  maxLongEdge: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const long = Math.max(w, h);
  const scale = long > maxLongEdge ? maxLongEdge / long : 1;
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.drawImage(img, 0, 0, outW, outH);
  return { canvas, width: outW, height: outH };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  qualityOrLevel: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("toBlob failed"));
        else resolve(b);
      },
      mime,
      mime === "image/png" ? undefined : qualityOrLevel / 100
    );
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageCompressorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<"jpg" | "png">("jpg");
  const [quality, setQuality] = useState(78);
  const [pngLevel, setPngLevel] = useState(9);
  const [maxDimension, setMaxDimension] = useState(1600);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    sourceName: string;
    sourceSize: number;
    outputName: string;
    outputBlob: Blob;
    outputSize: number;
    forcedResize: boolean;
    transparencyWarning: boolean;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setResult(null);
    setFileError(null);
    setConvertError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const type = f.type.toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png") {
      setFileError("רק JPG או PNG");
      setFile(null);
      return;
    }
    if (f.size > MAX_INPUT_BYTES) {
      setFileError("עד 50MB");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleConvert = async () => {
    const targetFormat = outputFormat;
    const maxPx = maxDimension;
    console.log("convert:start", {
      hasFile: !!file,
      fileSize: file?.size,
      targetFormat,
      quality,
      maxPx,
    });
    setConvertError(null);
    if (!file) {
      setConvertError("בחר קובץ להמרה");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const img = await loadImage(file);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const longEdge = Math.max(w, h);

      let targetMax = maxDimension === 0 ? 99999 : maxDimension;
      let forcedResize = false;
      if (longEdge > 2400) {
        if (maxDimension === 0) {
          targetMax = 2400;
          forcedResize = true;
        } else if (longEdge > targetMax) {
          targetMax = Math.min(2400, targetMax);
        }
      }

      const { canvas } = resizeToLongEdge(img, targetMax);

      let outputBlob: Blob;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      if (outputFormat === "jpg") {
        outputBlob = await canvasToBlob(canvas, "image/jpeg", quality);
      } else {
        outputBlob = await canvasToBlob(canvas, "image/png", pngLevel);
      }
      const outputExt = outputFormat === "jpg" ? ".jpg" : ".png";
      const outputName = baseName + outputExt;

      let transparencyWarning = false;
      if (outputFormat === "jpg" && (file.type === "image/png" || file.name.toLowerCase().endsWith(".png"))) {
        transparencyWarning = await hasTransparency(img);
      }

      setResult({
        sourceName: file.name,
        sourceSize: file.size,
        outputName,
        outputBlob,
        outputSize: outputBlob.size,
        forcedResize,
        transparencyWarning,
      });
    } catch (err) {
      console.error("convert:error", err);
      setConvertError("ההמרה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.outputName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-app text-app p-6 max-w-xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-app opacity-80 hover:opacity-100"
        >
          ← חזרה
        </Link>
        <h1 className="text-xl font-bold">דחיסת תמונה</h1>
      </div>

      <div className="space-y-4 surface-app border border-app rounded-xl p-4">
        <div>
          <label className="block text-sm font-medium mb-1">קובץ (JPG/PNG עד 50MB)</label>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
          {fileError && (
            <p className="text-red-600 text-sm mt-1">{fileError}</p>
          )}
          {file && (
            <p className="text-sm opacity-80 mt-1">
              {file.name} — {formatBytes(file.size)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">פורמט פלט</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={outputFormat === "jpg"}
                onChange={() => setOutputFormat("jpg")}
              />
              JPG
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={outputFormat === "png"}
                onChange={() => setOutputFormat("png")}
              />
              PNG
            </label>
          </div>
        </div>

        {outputFormat === "jpg" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              איכות JPG: {quality}
            </label>
            <input
              type="range"
              min={30}
              max={95}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {outputFormat === "png" && (
          <div>
            <label className="block text-sm font-medium mb-1">רמת דחיסה PNG (0–9)</label>
            <select
              value={pngLevel}
              onChange={(e) => setPngLevel(Number(e.target.value))}
              className="border border-app rounded px-3 py-2 bg-app text-app"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">מקסימום צד (פיקסלים)</label>
          <select
            value={maxDimension}
            onChange={(e) => setMaxDimension(Number(e.target.value))}
            className="border border-app rounded px-3 py-2 bg-app text-app"
          >
            {MAX_DIMENSION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleConvert}
          disabled={busy}
          className="btn-primary-app disabled:opacity-50"
        >
          {busy ? "ממיר..." : "המר"}
        </button>
        {convertError && (
          <p className="text-red-600 text-sm mt-1">{convertError}</p>
        )}
      </div>

      {result && (
        <div className="mt-6 surface-app border border-app rounded-xl p-4 space-y-3">
          <h2 className="font-bold">תוצאה</h2>
          <p className="text-sm">
            מקור: {result.sourceName} — {formatBytes(result.sourceSize)}
          </p>
          <p className="text-sm">
            תוצר: {result.outputName} — {formatBytes(result.outputSize)}
          </p>
          {result.forcedResize && (
            <p className="text-amber-600 text-sm">התמונה הייתה גדולה מדי; בוצע resize ל־2400px.</p>
          )}
          {result.transparencyWarning && (
            <p className="text-amber-600 text-sm">שקיפות תאבד (מקור PNG עם אלפא → JPG).</p>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="btn-primary-app"
          >
            הורד תוצר
          </button>
        </div>
      )}
    </div>
  );
}
