import type { StorefrontProduct } from "../../lib/catalog/types";
import { ProductCard } from "./product-card";
import { Reveal } from "./reveal";

export function ProductRail({
  products,
  index = "02",
  eyebrow = "Product campaign",
  title = "From the catalog.",
}: {
  products: StorefrontProduct[];
  index?: string;
  eyebrow?: string;
  title?: string;
}) {
  if (!products.length) return null;

  return (
    <section className="sf-section is-browse">
      <Reveal>
        <div className="sf-heading">
          <div className="sf-heading-meta"><span>{index}</span><span>{eyebrow}</span></div>
          <h2>{title}</h2>
        </div>
      </Reveal>
      <div className="sf-rail">
        {products.slice(0, 6).map((product, itemIndex) => (
          <ProductCard key={product.id} product={product} index={itemIndex} />
        ))}
      </div>
    </section>
  );
}
