export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

function getTargetSize(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= maxSide) return { width, height };
  const scale = maxSide / longSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeTypes: string[],
  quality: number
): Promise<Blob> {
  for (const mime of mimeTypes) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, quality)
    );
    if (blob) return blob;
  }
  throw new Error("Failed to encode image");
}

export async function resizeAndCompress(
  file: File,
  maxSide: number,
  quality: number,
  preferredMimeTypes: string[] = ["image/webp", "image/jpeg"]
): Promise<ResizedImage> {
  if (typeof window === "undefined") {
    throw new Error("resizeAndCompress can only run in the browser");
  }

  const img = await loadImageFromFile(file);
  const { width, height } = getTargetSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSide);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, preferredMimeTypes, quality);
  return { blob, width, height };
}

