"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { duration, ease } from "../../lib/motion";
import { SHOT } from "../../lib/content/shots";
import { ImageShot } from "./image-shot";

const STEPS = [
  { title: "Chosen with care", copy: "Only what earns a place in the catalog.", image: SHOT.citrusMacro },
  { title: "Clear origin", copy: "One source, named, for every group.", image: SHOT.citrus },
  { title: "Ready to supply", copy: "Stock and minimums sit with the product.", image: SHOT.avocado },
  { title: "Trade pricing", copy: "The visitor sees the world. The approved merchant sees the number.", image: SHOT.hands },
];

export function ScrollStory({ accentImage }: { accentImage?: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 48]);
  const steps = STEPS.map((step, index) => (
    index === 0 && accentImage ? { ...step, image: accentImage } : step
  ));

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(steps.length - 1, Math.floor(value * steps.length)));
  });

  return (
    <section ref={ref} className="sf-story">
      <div className="sf-story-pin">
        <div className="sf-story-visual">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className={`sf-story-shot ${index === active ? "is-on" : ""}`}
              animate={
                reduce
                  ? { opacity: index === active ? 1 : 0 }
                  : { opacity: index === active ? 1 : 0, scale: index === active ? 1 : 1.12 }
              }
              transition={{ duration: duration.cinematic, ease }}
            >
              <motion.div style={{ y: index === active ? imageY : 0, position: "absolute", inset: 0 }}>
                <ImageShot src={step.image} alt={step.title} sizes="56vw" preset="campaign" className="sf-fill" />
              </motion.div>
            </motion.div>
          ))}
          <div className="sf-story-progress" aria-hidden>
            <motion.i
              animate={{ height: `${((active + 1) / steps.length) * 100}%` }}
              transition={{ duration: duration.base, ease }}
            />
          </div>
        </div>
        <div className="sf-story-steps">
          <p className="sf-kicker">Why Almohit</p>
          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              className={`sf-story-step ${index === active ? "is-active" : ""}`}
              animate={
                reduce
                  ? undefined
                  : { opacity: index === active ? 1 : 0.34, x: index === active ? 0 : 16 }
              }
              transition={{ duration: duration.reveal, ease }}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <h3>{step.title}</h3>
                <motion.p
                  animate={reduce ? undefined : { opacity: index === active ? 1 : 0.55, y: index === active ? 0 : 6 }}
                  transition={{ duration: duration.base, ease }}
                >
                  {step.copy}
                </motion.p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
