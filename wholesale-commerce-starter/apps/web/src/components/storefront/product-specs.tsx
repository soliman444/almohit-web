"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, ease, stagger } from "../../lib/motion";
import type { StorefrontProduct } from "../../lib/storefront-types";

export function ProductSpecs({ product }: { product: StorefrontProduct }) {
  const reduce = useReducedMotion();
  const rows = [
    ["Collection", product.category.name],
    ["Brand", product.brand?.name ?? "—"],
    ["SKU", product.sku],
    ["Type", product.productType === "VARIABLE" ? "Variable" : "Simple"],
    ["Minimum", String(product.minOrderQuantity)],
    ["Availability", product.inStock ? "In stock" : "Unavailable"],
    ...(product.attributes ?? []).map((attribute) => [attribute.name, attribute.values.map((item) => item.value).join(", ") || "—"] as const),
  ];

  return (
    <section className="sf-pdp-specs">
      <h2>Specifications</h2>
      <ol>
        {rows.map(([label, value], index) => (
          <motion.li
            key={label}
            initial={reduce ? false : { y: 12 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.4, margin: "40px" }}
            transition={{ duration: duration.fast, ease, delay: Math.min(index, 6) * stagger.tight }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{label}</span>
            <span>{value}</span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
