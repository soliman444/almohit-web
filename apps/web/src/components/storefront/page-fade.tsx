"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { duration, ease } from "../../lib/motion";

export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    first.current = false;
  }, []);

  if (reduce) return <div>{children}</div>;

  return (
    <motion.div
      key={pathname}
      initial={first.current ? false : { opacity: 0, y: 22, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: duration.reveal, ease }}
    >
      {children}
    </motion.div>
  );
}
