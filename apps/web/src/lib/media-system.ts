export type MediaMode = "EDITORIAL_PHOTO" | "ISOLATED_PRODUCT";
export type MediaFit = "cover" | "contain";
export type MediaFitMode = "AUTO" | "COVER" | "CONTAIN";
export type MediaPreset =
  | "product-card"
  | "product-detail"
  | "category-card"
  | "category-hero"
  | "campaign";

export const MEDIA_ZOOM = {
  EDITORIAL_PHOTO: 1.04,
  ISOLATED_PRODUCT: 1.025,
} as const;

export const DEFAULT_FRAMING = {
  fitMode: "AUTO" as MediaFitMode,
  focalX: 50,
  focalY: 50,
  visualScale: 1,
};

/** Intentional crop anchors used only when a record has no saved focal point. */
export const CATEGORY_MEDIA_POSITION: Record<string, string> = {
  "basic-fruits": "50% 50%",
  "citrus-fruits": "50% 48%",
  berries: "50% 50%",
  "tropical-fruits": "50% 42%",
  "stone-fruits": "50% 50%",
  "desert-fruits": "50% 55%",
  "dried-fruits-nuts": "50% 50%",
  "fatty-fruits": "50% 50%",
  "other-fruits": "50% 50%",
  "fresh-produce": "50% 50%",
  beverages: "50% 40%",
  spices: "50% 60%",
  pantry: "50% 50%",
  dairy: "50% 45%",
  new: "50% 50%",
  catalog: "50% 50%",
};

export function mediaPositionFor(slug?: string | null, fallback = "50% 50%") {
  if (!slug) return fallback;
  return CATEGORY_MEDIA_POSITION[slug] ?? fallback;
}

export function parsePositionPair(position: string) {
  const [xRaw, yRaw] = position.split(/\s+/);
  const x = Number.parseFloat(xRaw ?? "50");
  const y = Number.parseFloat(yRaw ?? "50");
  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
  };
}

export function clampFocal(value: unknown, fallback = 50) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(100, Math.max(0, next));
}

export function clampScale(value: unknown, fallback = 1) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(1.3, Math.max(0.75, next));
}

export function parseFitMode(value?: string | null): MediaFitMode {
  if (value === "COVER" || value === "CONTAIN" || value === "AUTO") return value;
  return "AUTO";
}

export function hoverScale(base: number, mode: MediaMode) {
  return base * MEDIA_ZOOM[mode];
}

export function isIsolatedSrc(src?: string | null) {
  if (!src) return false;
  const lower = src.toLowerCase();
  const [path, query = ""] = lower.split("?");
  if (/(?:^|[?&])(?:isolated|transparent)=(?:1|true)(?:&|$)/.test(query)) return true;
  return /(^|[/_-])isolated([/_.-]|$)/.test(path);
}

export function resolveMediaMode(input: {
  fileType?: string | null;
  hasTransparentBackground?: boolean;
  mediaContext?: MediaPreset;
  src?: string | null;
  isolated?: boolean;
  mode?: MediaMode;
}): MediaMode {
  if (input.mediaContext === "category-card" || input.mediaContext === "category-hero") {
    return "EDITORIAL_PHOTO";
  }
  if (input.mode) return input.mode;
  if (input.isolated || input.hasTransparentBackground) return "ISOLATED_PRODUCT";
  if (isIsolatedSrc(input.src)) return "ISOLATED_PRODUCT";
  return "EDITORIAL_PHOTO";
}

export function getMediaFit(input: {
  fileType?: string | null;
  hasTransparentBackground?: boolean;
  mediaContext?: MediaPreset;
  src?: string | null;
  isolated?: boolean;
  mode?: MediaMode;
  fit?: MediaFit;
  fitMode?: MediaFitMode | null;
}): MediaFit {
  if (input.fit) return input.fit;
  if (input.fitMode === "COVER") return "cover";
  if (input.fitMode === "CONTAIN") return "contain";
  return resolveMediaMode(input) === "ISOLATED_PRODUCT" ? "contain" : "cover";
}

export function resolveMediaPresentation(input: {
  fileType?: string | null;
  hasTransparentBackground?: boolean;
  mediaContext?: MediaPreset;
  src?: string | null;
  isolated?: boolean;
  mode?: MediaMode;
  fit?: MediaFit;
  fitMode?: MediaFitMode | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
  categorySlug?: string | null;
}) {
  const mode = resolveMediaMode(input);
  const isolatedCard = mode === "ISOLATED_PRODUCT" && input.mediaContext === "product-card";
  const fallback = parsePositionPair(mediaPositionFor(input.categorySlug));
  const scale = clampScale(input.scale ?? DEFAULT_FRAMING.visualScale);
  return {
    mode,
    fit: getMediaFit({ ...input, mode }),
    focalX: clampFocal(input.focalX ?? fallback.x),
    focalY: clampFocal(input.focalY ?? fallback.y),
    scale,
    hover: hoverScale(scale, mode),
    zoom: MEDIA_ZOOM[mode],
    padding: isolatedCard ? "8%" : undefined,
  };
}
