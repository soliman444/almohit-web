"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ImageShot } from "./image-shot";

export function VisualBreak({ src, alt, title }: { src: string; alt: string; title: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 36, reduce ? 0 : -48]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  return (
    <section ref={ref} className="sf-bleed">
      <motion.div className="sf-bleed-visual" style={{ scale }}>
        <ImageShot src={src} alt={alt} sizes="100vw" preset="campaign" className="sf-fill" />
      </motion.div>
      <div className="sf-bleed-copy">
        <p className="sf-kicker">Almohit</p>
        <motion.h2 style={{ x }}>{title}</motion.h2>
      </div>
    </section>
  );
}
