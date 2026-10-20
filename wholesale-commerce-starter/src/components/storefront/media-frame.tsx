"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  resolveMediaPresentation,
  type MediaFit,
  type MediaFitMode,
  type MediaMode,
  type MediaPreset,
} from "../../lib/media-system";
import { resolveMediaSrc } from "./visuals";

type Props = {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  seed?: string;
  allowFallback?: boolean;
  preset?: MediaPreset;
  mode?: MediaMode;
  isolated?: boolean;
  fileType?: string | null;
  hasTransparentBackground?: boolean;
  categorySlug?: string | null;
  fit?: MediaFit;
  fitMode?: MediaFitMode | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
  onStatus?: (status: "ready" | "error") => void;
};

function isKnownRemote(src: string) {
  try {
    const host = new URL(src).hostname;
    return host === "images.unsplash.com" || host === "plus.unsplash.com";
  } catch {
    return false;
  }
}

export function MediaFrame({
  src,
  alt,
  sizes,
  className,
  priority,
  seed,
  allowFallback = true,
  preset = "product-card",
  mode,
  isolated,
  fileType,
  hasTransparentBackground,
  categorySlug,
  fit,
  fitMode,
  focalX,
  focalY,
  scale,
  onStatus,
}: Props) {
  const resolved = src || (allowFallback ? resolveMediaSrc(src, seed) : null);
  const [broken, setBroken] = useState(false);
  const presentation = resolveMediaPresentation({
    src: resolved,
    fileType,
    hasTransparentBackground,
    mediaContext: preset,
    isolated,
    mode,
    fit,
    fitMode,
    focalX,
    focalY,
    scale,
    categorySlug,
  });
  const modeClass = presentation.mode === "ISOLATED_PRODUCT" ? "is-isolated" : "is-editorial";
  const empty = !resolved || broken;

  return (
    <span
      className={["sf-media", `is-${preset}`, modeClass, empty ? "is-empty" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--sf-fit": presentation.fit,
          "--focal-x": String(presentation.focalX),
          "--focal-y": String(presentation.focalY),
          "--sf-scale": String(presentation.scale),
          "--sf-zoom": String(presentation.zoom),
          "--sf-media-pad": presentation.padding ?? "0px",
        } as CSSProperties
      }
    >
      {empty ? (
        <span className="sf-photo-fallback">
          <b>A</b>
          <em>Image unavailable</em>
        </span>
      ) : (
        <Image
          src={resolved}
          alt={alt}
          fill
          sizes={sizes}
          className="sf-photo"
          priority={priority}
          unoptimized={resolved.startsWith("http") && !isKnownRemote(resolved)}
          onError={() => {
            setBroken(true);
            onStatus?.("error");
          }}
          onLoad={() => onStatus?.("ready")}
        />
      )}
    </span>
  );
}
