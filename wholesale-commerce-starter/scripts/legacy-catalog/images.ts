import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const MAX_BYTES = 5_000_000;
const MIN_BYTES = 2_000;
const FETCH_MS = 20_000;

const IMAGE_MAGIC = [
  [0xFF, 0xD8, 0xFF],
  [0x89, 0x50, 0x4E, 0x47],
  [0x47, 0x49, 0x46, 0x38],
  [0x52, 0x49, 0x46, 0x46],
];

export type LoadedImage = {
  data: string;
  mimetype: string;
  source: "url" | "file";
  bytes: number;
};

export type ImageSourceKind = "url" | "file" | "missing" | "unsupported";

export function classifyImageSource(source: string | undefined): ImageSourceKind {
  if (!source?.trim()) return "missing";
  const value = source.trim();
  if (/^https?:\/\//i.test(value)) return "url";
  if (/^data:image\//i.test(value)) return "unsupported";
  return "file";
}

export function rewriteImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("unsplash.com")) {
      parsed.searchParams.set("w", "800");
      parsed.searchParams.set("q", "70");
      return parsed.toString();
    }
    if (parsed.hostname.includes("gstatic.com") && parsed.searchParams.get("s") === "10") {
      parsed.searchParams.set("s", "800");
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function looksLikeImage(buffer: Buffer) {
  return IMAGE_MAGIC.some((magic) => magic.every((byte, index) => buffer[index] === byte));
}

function mimetypeFor(buffer: Buffer, fallback: string) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return fallback.startsWith("image/") ? fallback.split(";")[0] : "image/jpeg";
}

export async function loadImageBytes(source: string): Promise<LoadedImage | null> {
  const kind = classifyImageSource(source);
  if (kind === "url") return fetchRemoteImage(source);
  if (kind === "file") return readLocalImage(source);
  return null;
}

async function readLocalImage(source: string): Promise<LoadedImage | null> {
  const candidates = isAbsolute(source)
    ? [source]
    : [
        resolve(process.cwd(), source),
        resolve(process.cwd(), "apps/web/public", source.replace(/^\/+/, "")),
        resolve(process.cwd(), "public", source.replace(/^\/+/, "")),
      ];
  for (const filePath of candidates) {
    try {
      const buffer = await readFile(filePath);
      if (!buffer.length || buffer.length > MAX_BYTES || !looksLikeImage(buffer)) continue;
      return {
        data: buffer.toString("base64"),
        mimetype: mimetypeFor(buffer, "image/jpeg"),
        source: "file",
        bytes: buffer.length,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchRemoteImage(url: string): Promise<LoadedImage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const response = await fetch(rewriteImageUrl(url), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; AlmohitLegacyCatalogMigration/1.1)",
        referer: "https://www.google.com/",
      },
    });
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") || "";
    if (mime.includes("text/html") || mime.includes("application/json")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_BYTES || buffer.length > MAX_BYTES) return null;
    if (!looksLikeImage(buffer) && !mime.startsWith("image/")) return null;
    return {
      data: buffer.toString("base64"),
      mimetype: mimetypeFor(buffer, mime),
      source: "url",
      bytes: buffer.length,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated use loadImageBytes */
export async function fetchImageBase64(url: string) {
  return loadImageBytes(url);
}
