const IMAGE_PREFIX = "/web/image/";

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
