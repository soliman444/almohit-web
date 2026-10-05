"use client";

import { type ReactNode, useState } from "react";
import { useReducedMotion } from "motion/react";

export function ViewCursor({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState({ x: 0, y: 0, on: false });

  return (
    <div
      onPointerMove={(event) => {
        if (reduce) return;
        const target = (event.target as HTMLElement).closest("[data-view]");
        setCursor({ x: event.clientX, y: event.clientY, on: Boolean(target) });
      }}
      onPointerLeave={() => setCursor((current) => ({ ...current, on: false }))}
    >
      {children}
      {cursor.on && <span className="sf-cursor" style={{ left: cursor.x, top: cursor.y }}>View</span>}
    </div>
  );
}
