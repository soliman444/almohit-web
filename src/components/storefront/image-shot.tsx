import type { ColorField } from "../../lib/shots";
import type { MediaFit, MediaFitMode, MediaMode, MediaPreset } from "../../lib/media-system";
import { MediaFrame } from "./media-frame";

type Treatment = "macro" | "isolated" | "table";

export function ImageShot({
  src,
  alt,
  sizes,
  treatment = "table",
  field,
  priority,
  seed,
  className = "",
  preset = "campaign",
  categorySlug,
  isolated,
  allowFallback,
  fit,
  fitMode,
  focalX,
  focalY,
  scale,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  treatment?: Treatment;
  field?: ColorField | "none";
  priority?: boolean;
  seed?: string;
  className?: string;
  preset?: MediaPreset;
  categorySlug?: string;
  isolated?: boolean;
  allowFallback?: boolean;
  fit?: MediaFit;
  fitMode?: MediaFitMode | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
}) {
  const fieldClass = field && field !== "none" ? ` is-${field}` : "";
  const mode: MediaMode | undefined = isolated || treatment === "isolated" ? "ISOLATED_PRODUCT" : undefined;
  return (
    <MediaFrame
      src={src}
      alt={alt}
      sizes={sizes}
      priority={priority}
      seed={seed}
      preset={preset}
      mode={mode}
      isolated={isolated || treatment === "isolated"}
      categorySlug={categorySlug}
      allowFallback={allowFallback}
      fit={fit}
      fitMode={fitMode}
      focalX={focalX}
      focalY={focalY}
      scale={scale}
      className={`sf-shot is-${treatment}${fieldClass} ${className}`.trim()}
    />
  );
}
