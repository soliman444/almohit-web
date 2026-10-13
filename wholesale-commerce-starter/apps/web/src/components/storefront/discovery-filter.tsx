"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { duration, ease } from "../../lib/motion";
import type { StorefrontProduct } from "../../lib/storefront-types";
import { ProductCard } from "./product-card";
import { ViewCursor } from "./view-cursor";

const TABS = [
  { id: "new", label: "New" },
  { id: "seasonal", label: "Seasonal" },
  { id: "luxe", label: "Luxe" },
  { id: "popular", label: "Most requested" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function pick(products: StorefrontProduct[], tab: Tab) {
  const byTab: Record<Tab, StorefrontProduct[]> = {
    new: products.filter((product) => product.isNew),
    seasonal: products.filter((product) => product.isFeatured || product.isNew),
    luxe: products.filter((product) => product.isFeatured),
    popular: products.filter((product) => product.isFeatured && product.inStock),
  };
  const selected = byTab[tab];
  return selected.length ? selected.slice(0, 4) : products.slice(0, 4);
}

export function DiscoveryFilter({ products }: { products: StorefrontProduct[] }) {
  const [tab, setTab] = useState<Tab>("new");
  const items = useMemo(() => pick(products, tab), [products, tab]);

  if (!products.length) return null;

  return (
    <section className="sf-section is-browse" id="arrivals">
      <div className="sf-heading">
        <div className="sf-heading-meta"><span>Winners</span><span>Discover</span></div>
        <h2>Recent from the catalog.</h2>
      </div>
      <div className="sf-tabs" role="tablist">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "is-active" : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {active ? <span className="sf-tab-line" /> : null}
            </button>
          );
        })}
      </div>
      <ViewCursor>
        <div className="sf-mosaic">
          <AnimatePresence mode="popLayout">
            {items.map((product, index) => (
              <motion.div
                key={product.id}
                initial={false}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 10 }}
                transition={{ duration: duration.base, ease }}
              >
                <ProductCard product={product} index={index} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ViewCursor>
    </section>
  );
}
