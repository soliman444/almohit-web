"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { duration, ease } from "../../lib/motion";
import type { StorefrontPromo } from "../../lib/content/promos";
import type { StorefrontProduct } from "../../lib/catalog/types";
import { ProductCard } from "./product-card";
import { DealBanner } from "./promo-system";
import { ViewCursor } from "./view-cursor";

const TABS = [
  { id: "best", label: "Best Sellers" },
  { id: "new", label: "New Arrivals" },
  { id: "offers", label: "Offers" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function ProductDiscovery({
  bestSellers,
  newArrivals,
  offers,
  promo,
}: {
  bestSellers: StorefrontProduct[];
  newArrivals: StorefrontProduct[];
  offers: StorefrontProduct[];
  promo?: StorefrontPromo;
}) {
  const [tab, setTab] = useState<Tab>("best");
  const items = useMemo(() => {
    const byTab: Record<Tab, StorefrontProduct[]> = {
      best: bestSellers,
      new: newArrivals,
      offers,
    };
    return byTab[tab];
  }, [bestSellers, newArrivals, offers, tab]);

  if (!bestSellers.length && !newArrivals.length && !offers.length) return null;

  return (
    <section className="sf-section is-browse" id="discovery">
      <h2 className="sf-section-title">Shop the catalog.</h2>
      <div className="sf-tabs" role="tablist" aria-label="Product discovery">
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
      {tab === "offers" && promo && <div className="sf-discovery-promo"><DealBanner promo={promo} /></div>}
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
