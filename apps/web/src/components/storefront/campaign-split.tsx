import { secondaryImage } from "../../lib/storefront-media";
import type { StorefrontProduct } from "../../lib/storefront-types";
import { ButtonLink } from "./button-link";
import { ImageShot } from "./image-shot";
import { EDITORIAL } from "./visuals";

export function CampaignSplit({ product }: { product: StorefrontProduct | null }) {
  const cutout = product ? secondaryImage(product) : null;

  return (
    <section className="sf-camp-b">
      <div className="sf-camp-b-dark">
        <p className="sf-kicker">Selected</p>
        <h2>{product ? product.name : "From the catalog."}</h2>
        <p>{product?.shortDescription || "A closer look at fruit we put forward."}</p>
        {product && (
          <div style={{ marginTop: 28 }}>
            <ButtonLink href={`/products/${product.slug}`} invert>Open product</ButtonLink>
          </div>
        )}
      </div>
      <div className="sf-camp-b-light">
        <div className="sf-camp-b-cutout">
          <ImageShot
            src={cutout?.src || EDITORIAL.oil}
            alt={cutout?.alt || product?.name || "Isolated product"}
            seed={product?.slug || "split"}
            sizes="46vw"
            preset="campaign"
            isolated
            categorySlug={product?.category.slug}
            field="flare"
            className="sf-fill"
          />
        </div>
      </div>
    </section>
  );
}
