"use client";

import { useMemo, useState } from "react";
import type { DisplayCurrencyCode } from "../../config/currencies";
import type { ProductShot } from "../../lib/catalog/media";
import type { StorefrontProduct } from "../../lib/catalog/types";
import { ProductGallery } from "./product-gallery";
import { ProductInfoPanel } from "./product-info-panel";
import { resolveSelectedVariant } from "./variant-picker";

export function ProductDetailMedia({
  product,
  shots,
  currency,
  showPrices,
  allowAddToCart,
  requestHref,
  notice,
  error,
}: {
  product: StorefrontProduct;
  shots: ProductShot[];
  currency: DisplayCurrencyCode;
  showPrices: boolean;
  allowAddToCart: boolean;
  requestHref: string;
  notice?: string;
  error?: string;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const variant = resolveSelectedVariant(product, selected);
  const displayShots = useMemo(() => {
    if (!variant?.imageUrl) return shots;
    const lead: ProductShot = { src: variant.imageUrl, alt: variant.name, isolated: false };
    return [lead, ...shots.filter((shot) => shot.src !== variant.imageUrl)];
  }, [shots, variant]);

  return (
    <>
      <ProductGallery shots={displayShots} name={product.name} slug={product.slug} categorySlug={product.category.slug} />
      <ProductInfoPanel
        product={product}
        currency={currency}
        showPrices={showPrices}
        allowAddToCart={allowAddToCart}
        requestHref={requestHref}
        notice={notice}
        error={error}
        selection={{ selected, onChange: setSelected }}
      />
    </>
  );
}
