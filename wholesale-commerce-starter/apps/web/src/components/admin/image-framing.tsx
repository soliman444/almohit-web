"use client";

import { useState } from "react";
import { DEFAULT_FRAMING, type MediaFitMode } from "../../lib/media-system";
import { MediaFrame } from "../storefront/media-frame";

export function ImageFramingFields({
  src,
  fitMode = DEFAULT_FRAMING.fitMode,
  focalX = DEFAULT_FRAMING.focalX,
  focalY = DEFAULT_FRAMING.focalY,
  visualScale = DEFAULT_FRAMING.visualScale,
  names = { fitMode: "fitMode", focalX: "focalX", focalY: "focalY", visualScale: "visualScale" },
  showPdp = true,
}: {
  src?: string;
  fitMode?: MediaFitMode;
  focalX?: number;
  focalY?: number;
  visualScale?: number;
  names?: { fitMode: string; focalX: string; focalY: string; visualScale: string };
  showPdp?: boolean;
}) {
  const [fit, setFit] = useState<MediaFitMode>(fitMode);
  const [x, setX] = useState(focalX);
  const [y, setY] = useState(focalY);
  const [scale, setScale] = useState(visualScale);

  return (
    <div className="admin-framing">
      <h3>Image framing</h3>
      <p className="muted">Adjust the subject inside the storefront frame. Defaults are 50 / 50 / 100%.</p>
      <div className="grid">
        <label className="field">Fit
          <select name={names.fitMode} value={fit} onChange={(event) => setFit(event.target.value as MediaFitMode)}>
            <option value="AUTO">Auto</option>
            <option value="COVER">Cover</option>
            <option value="CONTAIN">Contain</option>
          </select>
        </label>
        <label className="field">Horizontal focal point {Math.round(x)}
          <input name={names.focalX} type="range" min={0} max={100} step={1} value={x} onChange={(event) => setX(Number(event.target.value))} />
        </label>
        <label className="field">Vertical focal point {Math.round(y)}
          <input name={names.focalY} type="range" min={0} max={100} step={1} value={y} onChange={(event) => setY(Number(event.target.value))} />
        </label>
        <label className="field">Visual scale {Math.round(scale * 100)}%
          <input name={names.visualScale} type="range" min={0.75} max={1.3} step={0.01} value={scale} onChange={(event) => setScale(Number(event.target.value))} />
        </label>
      </div>
      <div className={`admin-frame-previews${showPdp ? " has-pdp" : ""}`}>
        <div>
          <span className="muted">Product card 4:5</span>
          <div className="admin-frame-card">
            <MediaFrame
              src={src || null}
              alt="Card preview"
              sizes="200px"
              allowFallback={false}
              preset="product-card"
              fitMode={fit}
              focalX={x}
              focalY={y}
              scale={scale}
            />
          </div>
        </div>
        {showPdp && (
          <div>
            <span className="muted">PDP stage</span>
            <div className="admin-frame-pdp">
              <MediaFrame
                src={src || null}
                alt="PDP preview"
                sizes="360px"
                allowFallback={false}
                preset="product-detail"
                fitMode={fit}
                focalX={x}
                focalY={y}
                scale={scale}
                className="sf-fill"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HeroFramingFields({
  src,
  focalX = 50,
  focalY = 50,
  scale = 1,
}: {
  src?: string;
  focalX?: number;
  focalY?: number;
  scale?: number;
}) {
  const [x, setX] = useState(focalX);
  const [y, setY] = useState(focalY);
  const [zoom, setZoom] = useState(scale);

  return (
    <div className="admin-framing">
      <h3>Category hero framing</h3>
      <div className="grid">
        <label className="field">Horizontal focal {Math.round(x)}
          <input name="heroFocalX" type="range" min={0} max={100} step={1} value={x} onChange={(event) => setX(Number(event.target.value))} />
        </label>
        <label className="field">Vertical focal {Math.round(y)}
          <input name="heroFocalY" type="range" min={0} max={100} step={1} value={y} onChange={(event) => setY(Number(event.target.value))} />
        </label>
        <label className="field">Scale {Math.round(zoom * 100)}%
          <input name="heroScale" type="range" min={0.75} max={1.3} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
      </div>
      <div className="admin-hero-preview">
        <MediaFrame
          src={src || null}
          alt="Hero preview"
          sizes="640px"
          allowFallback={false}
          preset="category-hero"
          focalX={x}
          focalY={y}
          scale={zoom}
          className="sf-fill"
        />
      </div>
    </div>
  );
}
