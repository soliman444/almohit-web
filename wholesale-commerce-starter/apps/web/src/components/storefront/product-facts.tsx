import type { StorefrontProduct } from "../../lib/storefront-types";

export function ProductFacts({ product }: { product: StorefrontProduct }) {
  const facts = [
    ["Collection", product.category.name],
    ["Brand", product.brand?.name ?? "Almohit"],
    ["SKU", product.sku],
    ["Minimum", String(product.minOrderQuantity)],
    ["Availability", product.inStock ? "Available to supply" : "Currently unavailable"],
  ] as const;

  return (
    <section className="sf-pdp-facts" aria-label="Key product facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </section>
  );
}
