"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, ease } from "../../lib/motion";
import type { StorefrontProduct } from "../../lib/catalog/types";
import { ProductCard } from "./product-card";

export function ProductRelated({ products }: { products: StorefrontProduct[] }) {
  const reduce = useReducedMotion();
  if (!products.length) return null;

  return (
    <section className="sf-pdp-related">
      <h2>From the same collection</h2>
      <div className="sf-pdp-related-rail">
        {products.slice(0, 4).map((product, index) => (
          <motion.div
            key={product.id}
            className={`sf-pdp-related-item${index === 0 ? " is-lead" : ""}`}
            initial={reduce ? false : { x: 22 }}
            whileInView={{ x: 0 }}
            viewport={{ once: true, amount: 0.2, margin: "60px" }}
            transition={{ duration: duration.reveal, ease, delay: index * 0.08 }}
          >
            <ProductCard product={product} index={index} size={index === 0 ? "wide" : "default"} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
