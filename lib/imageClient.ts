export type CompressedResult = {
  blob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  mime: string;
  sizeBytes: number;
};

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement, targetLongEdge: number) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const longEdge = Math.max(srcW, srcH);
  const scale = longEdge > targetLongEdge ? targetLongEdge / longEdge : 1;

  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.drawImage(img, 0, 0, w, h);

  return { canvas, width: w, height: h };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("toBlob returned null"));
        resolve(b);
      },
      mime,
      quality
    );
  });
}

async function exportBlobWithFallback(
  canvas: HTMLCanvasElement,
  preferWebpQuality: number,
  jpegQuality: number
): Promise<{ blob: Blob; mime: string }> {
  try {
    const webp = await canvasToBlob(canvas, "image/webp", preferWebpQuality);
    if (webp && webp.size > 0) {
      return { blob: webp, mime: "image/webp" };
    }
  } catch {
    // ignore and fallback
  }
  const jpg = await canvasToBlob(canvas, "image/jpeg", jpegQuality);
  return { blob: jpg, mime: "image/jpeg" };
}

export async function compressImageFile(file: File): Promise<CompressedResult> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("MAX_15MB");
  }

  const img = await loadImageFromFile(file);

  const main = drawToCanvas(img, 1600);
  const mainOut = await exportBlobWithFallback(main.canvas, 0.78, 0.82);

  const thumb = drawToCanvas(img, 400);
  const thumbOut = await exportBlobWithFallback(thumb.canvas, 0.7, 0.78);

  return {
    blob: mainOut.blob,
    thumbBlob: thumbOut.blob,
    width: main.width,
    height: main.height,
    mime: mainOut.mime,
    sizeBytes: mainOut.blob.size,
  };
}

