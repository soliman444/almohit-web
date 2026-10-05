"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { MediaPreset } from "../../lib/media-system";
import { mediaPositionFor, parsePositionPair } from "../../lib/media-system";
import { ImageShot } from "./image-shot";

export function HeroVideo({
  src,
  poster,
  alt,
  className = "",
  preset = "campaign",
  categorySlug,
  focalX,
  focalY,
  scale,
}: {
  src?: string;
  poster?: string;
  alt: string;
  className?: string;
  preset?: MediaPreset;
  categorySlug?: string;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState(!src);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !src || failed || reduceMotion) return;
    node.muted = true;
    node.defaultMuted = true;

    const play = () => {
      node.muted = true;
      void node.play().then(() => setPlaying(true)).catch(() => undefined);
    };

    play();
    node.addEventListener("canplay", play);
    node.addEventListener("loadeddata", play);
    const onVisible = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      node.removeEventListener("canplay", play);
      node.removeEventListener("loadeddata", play);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [failed, reduceMotion, src]);

  return (
    <div
      className={`sf-live-media ${playing ? "is-playing" : ""} ${className}`.trim()}
      style={
        {
          "--focal-x": String(focalX ?? parsePositionPair(mediaPositionFor(categorySlug)).x),
          "--focal-y": String(focalY ?? parsePositionPair(mediaPositionFor(categorySlug)).y),
          "--sf-scale": String(scale ?? 1),
        } as CSSProperties
      }
    >
      {poster ? (
        <ImageShot
          src={poster}
          alt={alt}
          sizes="100vw"
          priority
          preset={preset}
          categorySlug={categorySlug}
          focalX={focalX}
          focalY={focalY}
          scale={scale}
          className="sf-fill"
        />
      ) : (
        <div className="sf-live-fallback" aria-hidden />
      )}
      {src && !failed && !reduceMotion ? (
        <video
          ref={videoRef}
          className="sf-live-video"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
