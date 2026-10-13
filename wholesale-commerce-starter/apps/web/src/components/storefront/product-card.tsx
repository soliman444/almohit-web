"use client";

import Link from "next/link";
import { fieldFor } from "../../lib/shots";
import { promoForProduct } from "../../lib/storefront-promos";
import { galleryImages, primaryImage, productRevealMode, secondaryImage, viewTransitionName } from "../../lib/storefront-media";
import type { StorefrontProduct } from "../../lib/storefront-types";
import { useFormatDisplayMoney } from "./display-currency";
import { MediaFrame } from "./media-frame";
import { Reveal } from "./reveal";

export function ProductCard({
  product,
  index = 0,
  size = "default",
}: {
  product: StorefrontProduct;
  index?: number;
  size?: "default" | "wide" | "feature";
}) {
  const image = primaryImage(product);
  const next = secondaryImage(product);
  console.log('[card]', product.slug, {
    totalMedia: product.media?.length,
    galleryCount: galleryImages(product).length,
    hasNext: !!next,
    mediaTypes: product.media?.map((m) => m.media.fileType),
  });

  const promo = promoForProduct(product.slug);
  const field = fieldFor(index);
  const formatMoney = useFormatDisplayMoney();
  const priceLabel = product.price ? formatMoney(product.price.amount) : "Price available to approved buyers";

  return (
    <Reveal delay={Math.min(index, 3) * 0.07}>
      <article className={`sf-product is-${size}`}>
        <Link href={`/products/${product.slug}`}>
          <div
            className={`sf-product-media sf-shot is-table is-${field}`}
            data-view
            style={{ viewTransitionName: viewTransitionName(product.slug) }}
          >
            <span className="sf-product-label">{product.category.name}</span>
            {promo?.badge && <span className="sf-offer-badge">{promo.badge}</span>}
            <MediaFrame
              src={image?.src}
              alt={image?.alt || product.name}
              seed={product.slug}
              sizes={size === "feature" ? "70vw" : size === "wide" ? "56vw" : "(max-width: 700px) 82vw, 38vw"}
              preset="product-card"
              mode={productRevealMode(image?.src)}
              categorySlug={product.category.slug}
              fitMode={image?.fitMode}
              focalX={image?.focalX}
              focalY={image?.focalY}
              scale={image?.scale}
              allowFallback={false}
              className="is-primary"
            />
            {next && (
              <MediaFrame
                src={next.src}
                alt={next.alt || product.name}
                seed={`${product.slug}-b`}
                sizes="40vw"
                preset="product-card"
                mode={productRevealMode(next.src)}
                categorySlug={product.category.slug}
                fitMode={next.fitMode}
                focalX={next.focalX}
                focalY={next.focalY}
                scale={next.scale}
                allowFallback={false}
                className="is-secondary"
              />
            )}
            <div className="sf-product-hover">
              <p>MOQ {product.minOrderQuantity}</p>
              <p>{product.inStock ? "Available to supply" : "Currently unavailable"}</p>
              <p>{priceLabel}</p>
              <span className="sf-product-cta">{product.price ? "Open product" : "View details"}</span>
            </div>
          </div>
          <div className="sf-product-meta">
            <p className="sf-product-kicker">{product.category.name}</p>
            <h3>{product.name}</h3>
            <p>{product.brand?.name ?? "Almohit"}</p>
            <p className="sf-price-note">{priceLabel}</p>
          </div>
        </Link>
      </article>
    </Reveal>
  );
}
