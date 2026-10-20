"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, ease, stagger } from "../../lib/motion";
import type { ProductShot } from "../../lib/catalog/media";
import { MediaFrame } from "./media-frame";

function storyParts(text: string) {
  const blocks = text.split(/\n+/).flatMap((part) => part.split(/(?<=\.)\s+(?=[A-Z\u0600-\u06FF])/)).map((part) => part.trim()).filter(Boolean);
  return blocks.length ? blocks : [text];
}

export function ProductStoryBlock({
  text,
  image,
  name,
}: {
  text: string;
  image: ProductShot | null;
  name: string;
}) {
  const reduce = useReducedMotion();
  const parts = storyParts(text);

  return (
    <section className={`sf-pdp-story${image ? " is-split" : " is-type"}`}>
      {image && (
        <motion.div
          className={`sf-pdp-story-media${image.isolated ? " is-isolated" : ""}`}
          initial={reduce ? false : { clipPath: "inset(12% 10% 12% 10%)" }}
          whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
          viewport={{ once: true, amount: 0.2, margin: "80px" }}
          transition={{ duration: duration.reveal, ease }}
        >
          <MediaFrame
            src={image.src}
            alt={image.alt || name}
            seed={`${name}-story`}
            sizes="(max-width: 900px) 100vw, 42vw"
            allowFallback={false}
            preset="product-detail"
            isolated={image.isolated}
            fitMode={image.fitMode}
            focalX={image.focalX}
            focalY={image.focalY}
            scale={image.scale}
            className="sf-fill"
          />
        </motion.div>
      )}
      <div className="sf-pdp-story-copy">
        <h2>
          <span className="sf-clip">
            <motion.span
              className="sf-line"
              initial={reduce ? false : { y: "110%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease }}
            >
              Product story
            </motion.span>
          </span>
        </h2>
        {parts.map((part, index) => (
          <motion.p
            key={part.slice(0, 24) + index}
            initial={reduce ? false : { y: 16 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: duration.base, ease, delay: index * stagger.base }}
          >
            {part}
          </motion.p>
        ))}
      </div>
    </section>
  );
}
