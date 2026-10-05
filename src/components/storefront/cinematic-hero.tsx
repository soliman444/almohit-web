"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { stagger } from "../../lib/motion";
import { ButtonLink } from "./button-link";
import { HeroVideo } from "./hero-video";

type Collection = { index: string; name: string; href: string };

const TITLE = ["Fruit season", "starts here"] as const;

export function CinematicHero({
  collections,
  image,
  focalX,
  focalY,
  frameScale,
}: {
  collections: Collection[];
  image?: string | null;
  focalX?: number | null;
  focalY?: number | null;
  frameScale?: number | null;
}) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, 80]);
  const imageScale = useTransform(scrollY, [0, 700], [1.06, 1.14]);

  useEffect(() => {
    setReady(true);
  }, []);

  const reduce = ready && Boolean(reduceMotion);

  return (
    <section className="sf-hero">
      <link rel="preload" as="video" href="/heroes/home-motion.mp4?v=10433" type="video/mp4" />
      <motion.div
        className="sf-hero-main"
        style={ready && !reduce ? { y: imageY, scale: imageScale } : undefined}
      >
        <HeroVideo
          src="/heroes/home-motion.mp4?v=10433"
          poster={image ?? undefined}
          alt="Catalog opening"
          preset="campaign"
          categorySlug="fresh-produce"
          focalX={focalX}
          focalY={focalY}
          scale={frameScale}
        />
      </motion.div>
      <div className="sf-hero-shade" aria-hidden />

      <div className="sf-hero-copy">
        <div className="sf-pills">
          <span className="sf-pill">Featured catalog</span>
          <span className="sf-pill">Oct 3, 2026</span>
          <span className="sf-pill">Trade after approval</span>
        </div>
        <h1 className="sf-hero-title">
          {TITLE.map((line, index) => (
            <span className="sf-clip" key={line}>
              <span
                className="sf-line"
                style={{ animationDelay: `${0.12 + index * stagger.display}s` }}
              >
                {line.split(" ").map((word, wordIndex, words) => (
                  <span className="sf-word" key={word}>
                    {word}
                    {wordIndex < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </h1>
        <div className="sf-hero-meta">
          <div className="sf-hero-credits">
            <span>Almohit</span>
            {collections.slice(0, 2).map((item) => (
              <a key={item.href} href={item.href}>{item.name}</a>
            ))}
          </div>
          <div className="sf-hero-cta">
            <ButtonLink href="/products" plain>Browse the collection</ButtonLink>
            <ButtonLink href="/register" ghost plain>Request a trade account</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
