"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ButtonLink } from "./button-link";
import { ImageShot } from "./image-shot";
import { EDITORIAL } from "./visuals";

export function BrandMoment({
  src,
  title = "Seen before it is priced.",
}: {
  src?: string;
  title?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -60]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  return (
    <section ref={ref} className="sf-bleed">
      <motion.div className="sf-bleed-visual" style={{ scale }}>
        <ImageShot src={src || EDITORIAL.night} alt="Brand moment" sizes="100vw" preset="campaign" className="sf-fill" />
      </motion.div>
      <div className="sf-bleed-copy">
        <motion.h2 style={{ x }}>{title}</motion.h2>
        <ButtonLink href="/products" ghost>Explore the collection</ButtonLink>
      </div>
    </section>
  );
}
