"use client";

import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { CategoryHeroProps } from "../../lib/category-heroes";
import { duration, ease, stagger } from "../../lib/motion";
import { HeroVideo } from "./hero-video";
import { ImageShot } from "./image-shot";

function titleLines(title: string) {
  const lines = title.split(/(?<=\.)\s+/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : [title];
}

function HeroCopy({
  title,
  subtitle,
  eyebrow,
  productCount,
  delay = 0.18,
}: Pick<CategoryHeroProps, "title" | "subtitle" | "eyebrow" | "productCount"> & { delay?: number }) {
  const reduce = useReducedMotion();
  const lines = titleLines(title);
  return (
    <div className="sf-cat-copy">
      <motion.p className="sf-kicker" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        {eyebrow || "Collection"}
      </motion.p>
      <h1>
        {lines.map((line, index) => (
          <span className="sf-clip" key={line}>
            <motion.span
              className="sf-line"
              initial={reduce ? false : { y: "110%", filter: "blur(8px)" }}
              animate={{ y: "0%", filter: "blur(0px)" }}
              transition={{ delay: delay + index * stagger.display, duration: duration.reveal, ease }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>
      {subtitle && (
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.28, duration: duration.reveal, ease }}
        >
          {subtitle}
        </motion.p>
      )}
      {typeof productCount === "number" && (
        <p className="sf-count">{String(productCount).padStart(2, "0")} items</p>
      )}
    </div>
  );
}

export function CategoryHero({
  mode,
  title,
  subtitle,
  eyebrow,
  image,
  video,
  poster,
  accent = "night",
  productCount,
  slug,
  focalX,
  focalY,
  frameScale,
}: CategoryHeroProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1 : 1.16]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 40, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 40, damping: 22 });
  const visual = image || poster;

  const onMove = (event: MouseEvent<HTMLElement>) => {
    if (reduce || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left - rect.width / 2) / 36);
    pointerY.set((event.clientY - rect.top - rect.height / 2) / 36);
  };

  return (
    <section
      ref={ref}
      className={`sf-cat-hero is-${mode} is-${accent}`}
      onMouseMove={onMove}
    >
      {mode === "split-dynamic" ? (
        <>
          <motion.div className="sf-cat-split-visual" style={{ y: reduce ? 0 : y, scale }}>
            <ImageShot src={visual} alt={title} sizes="58vw" priority preset="category-hero" categorySlug={slug} focalX={focalX} focalY={focalY} scale={frameScale} className="sf-fill" />
          </motion.div>
          <div className="sf-cat-split-copy">
            <HeroCopy title={title} subtitle={subtitle} eyebrow={eyebrow} productCount={productCount} />
          </div>
        </>
      ) : (
        <>
          {mode === "video-loop" ? (
            <motion.div className="sf-cat-stage" style={{ scale: reduce ? 1 : 1.04 }}>
              <HeroVideo src={video} poster={poster || visual} alt={title} preset="category-hero" categorySlug={slug} focalX={focalX} focalY={focalY} scale={frameScale} />
            </motion.div>
          ) : mode === "color-field-product" ? (
            <motion.div className="sf-cat-float" style={{ x: springX, y: springY }}>
              <ImageShot src={visual} alt={title} sizes="56vw" priority preset="category-hero" categorySlug={slug} field={accent} focalX={focalX} focalY={focalY} scale={frameScale} className="sf-fill" />
            </motion.div>
          ) : (
            <motion.div
              className="sf-cat-stage"
              style={{ y: reduce || mode === "macro-reveal" ? 0 : y, scale }}
              initial={reduce ? false : mode === "macro-reveal" ? { clipPath: "inset(18% 14% 22% 14%)", scale: 1.16 } : { clipPath: "inset(12% 10% 16% 10%)" }}
              animate={{ clipPath: "inset(0%)", scale: 1.08 }}
              transition={{ duration: duration.cinematic, ease }}
            >
              <ImageShot
                src={visual}
                alt={title}
                sizes="100vw"
                priority
                preset="category-hero"
                categorySlug={slug}
                focalX={focalX}
                focalY={focalY}
                scale={frameScale}
                className="sf-fill"
              />
            </motion.div>
          )}
          <div className="sf-cat-shade" />
          <HeroCopy
            title={title}
            subtitle={subtitle}
            eyebrow={eyebrow}
            productCount={productCount}
            delay={mode === "macro-reveal" ? 0.42 : 0.16}
          />
        </>
      )}
      <a className="sf-scroll" href="#category-intro">Scroll</a>
    </section>
  );
}
