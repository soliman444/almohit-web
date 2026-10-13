"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, ease } from "../../lib/motion";
import { ButtonLink } from "./button-link";
import { Reveal } from "./reveal";

const BENEFITS = ["Approved account", "Trade prices", "Faster orders"];

export function WholesaleCta() {
  const reduce = useReducedMotion();
  return (
    <section className="sf-cta">
      <div className="sf-cta-texture" aria-hidden />
      <motion.div
        className="sf-cta-glow"
        animate={reduce ? undefined : { x: [0, -24, 12, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="sf-cta-line"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: duration.cinematic, ease }}
      />
      <Reveal>
        <h2>Unlock wholesale pricing.</h2>
        <div className="sf-cta-benefits">
          {BENEFITS.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <ButtonLink href="/register" invert>Request a business account</ButtonLink>
      </Reveal>
    </section>
  );
}
