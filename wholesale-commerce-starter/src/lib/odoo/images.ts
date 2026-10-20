import { ApiClientError } from "./errors";

const IMAGE_PREFIX = "/web/image/";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function rewriteOdooImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = url.startsWith("http://") || url.startsWith("https://")
      ? new URL(url)
      : new URL(url, "http://odoo.invalid");
    if (!parsed.pathname.startsWith(IMAGE_PREFIX)) return null;
    if (parsed.pathname.includes("..")) return null;
    return `/odoo-media${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function isAllowedOdooImagePath(parts: string[]) {
  if (parts.length < 2) return false;
  if (parts[0] !== "web" || parts[1] !== "image") return false;
  return parts.every((part) => part.length > 0 && !part.includes("..") && !part.includes("\\") && !part.includes("/"));
}

export async function decodeUploadImage(file: File | null): Promise<{
  imageBase64?: string;
  imageContentType?: string;
}> {
  if (!file || file.size === 0) return {};
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ApiClientError(400, "INVALID_IMAGE", "Image type is not allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiClientError(400, "INVALID_IMAGE", "Image is missing or too large.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    imageBase64: buffer.toString("base64"),
    imageContentType: file.type,
  };
}
