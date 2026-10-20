import { type CSSProperties, type ReactNode } from "react";

/**
 * Content stays visible on first paint. Motion never owns opacity.
 * IntersectionObserver / whileInView must not hide storefront sections.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={className ? `sf-reveal ${className}` : "sf-reveal"}
      style={{ "--sf-reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
