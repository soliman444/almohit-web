"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { primaryImage } from "../../lib/catalog/media";
import type { StorefrontProduct } from "../../lib/catalog/types";
import { ImageShot } from "./image-shot";
import { EDITORIAL } from "./visuals";

export function FeaturedCampaign({ product }: { product: StorefrontProduct | null }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -36, reduce ? 0 : 36]);
  const image = product ? primaryImage(product) : null;

  return (
    <section ref={ref} className="sf-camp-a">
      <div className="sf-camp-a-visual">
        <motion.div style={{ scale, y, position: "absolute", inset: 0 }}>
          <ImageShot
            src={image?.src || EDITORIAL.oil}
            alt={image?.alt || product?.name || "Selected campaign"}
            seed={product?.slug || "campaign"}
            sizes="80vw"
            preset="campaign"
            categorySlug={product?.category.slug}
            className="sf-fill"
          />
        </motion.div>
      </div>
      <div className="sf-camp-a-copy">
        <p className="sf-kicker">{product ? "Selected" : "Front"}</p>
        <h2>{product ? product.name : "A piece read as a headline."}</h2>
        <p>{product?.shortDescription || "One product takes the screen. Type cuts the image. The price appears after approval only."}</p>
        {product ? (
          <Link className="sf-text-link" href={`/products/${product.slug}`}>Discover →</Link>
        ) : (
          <Link className="sf-text-link" href="/products">Catalog</Link>
        )}
      </div>
    </section>
  );
}
