export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB (client compresses before upload)
const UPLOAD_DIR = "public/uploads/proposal-logos";

function extensionFromMime(mime: string): string {
  if (mime === "image/webp") return ".webp";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  return ".webp";
}

export async function POST(req: Request) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use PNG, JPEG, or WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max 2MB." },
      { status: 400 }
    );
  }

  const ext = extensionFromMime(file.type);
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), UPLOAD_DIR);
  const filepath = path.join(dir, filename);

  try {
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch (err) {
    console.error("Proposal logo upload write error:", err);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }

  const url = `/uploads/proposal-logos/${filename}`;
  return NextResponse.json({ url });
}
