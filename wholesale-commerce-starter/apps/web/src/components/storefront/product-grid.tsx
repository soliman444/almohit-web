import type { StorefrontPromo } from "../../lib/storefront-promos";
import type { StorefrontProduct } from "../../lib/storefront-types";
import { ProductCard } from "./product-card";
import { PromoSlot } from "./promo-system";
import { ViewCursor } from "./view-cursor";

export function ProductGrid({
  products,
  variant = "default",
  promo,
}: {
  products: StorefrontProduct[];
  variant?: "default" | "selected" | "catalog" | "mixed";
  promo?: StorefrontPromo;
}) {
  if (!products.length) {
    return <div className="sf-empty">No products in this collection yet.</div>;
  }

  const ordered = (() => {
    if (variant === "catalog" || variant === "selected") return products;
    const featured = products.filter((product) => product.isFeatured);
    const featuredIds = new Set(featured.map((product) => product.id));
    const rest = products.filter((product) => !featuredIds.has(product.id));
    return featured.length ? [...featured, ...rest] : products;
  })();

  return (
    <ViewCursor>
      <div className={`sf-mosaic is-${variant}`}>
        {ordered.flatMap((product, index) => {
          const lead = (variant === "mixed" || variant === "default") && product.isFeatured && index === 0;
          const card = (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              size={lead || (variant === "selected" && index === 0) ? "feature" : "default"}
            />
          );
          if (variant === "mixed" && promo && index === 3) {
            return [card, <PromoSlot key="mixed-promo" promo={promo} />];
          }
          return [card];
        })}
      </div>
    </ViewCursor>
  );
}
