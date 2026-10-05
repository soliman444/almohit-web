"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { duration, ease } from "../../lib/motion";
import type { DisplayCurrencyCode } from "../../config/currencies";
import { useFormatFromUSD } from "./display-currency";
import type { StorefrontProduct } from "../../lib/storefront-types";
import { AddToCartForm } from "./add-to-cart-form";
import { ButtonLink } from "./button-link";
import { VariantPicker, resolveSelectedVariant } from "./variant-picker";

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function ProductInfoPanel({
  product,
  showPrices,
  requestHref,
  notice,
  error,
}: {
  product: StorefrontProduct;
  currency: DisplayCurrencyCode;
  showPrices: boolean;
  requestHref: string;
  notice?: string;
  error?: string;
}) {
  const formatMoney = useFormatFromUSD();
  const reduce = useReducedMotion();
  const panelShift = usePanelShift(reduce);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const variable = product.productType === "VARIABLE";
  const variant = variable ? resolveSelectedVariant(product, selected) : null;
  const sku = variant?.sku ?? product.sku;
  const inStock = variable ? Boolean(variant?.inStock) : product.inStock;
  const price = variable ? variant?.price : product.price ?? undefined;

  return (
    <motion.div className="sf-pdp-panel" style={panelShift}>
      <motion.p
        className="sf-kicker sf-pdp-kicker"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={fade}
        transition={{ duration: duration.base, ease, delay: 0 }}
      >
        <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link>
        {product.brand ? `  /  ${product.brand.name}` : ""}
      </motion.p>
      <h1>
        {product.name.split(/\s+/).map((word, index) => (
          <span className="sf-clip" key={`${word}-${index}`}>
            <motion.span
              className="sf-line"
              initial={reduce ? false : { y: "108%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.68, ease, delay: 0.14 + index * 0.07 }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </h1>
      <motion.p
        className="sf-sku"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={fade}
        transition={{ duration: duration.base, ease, delay: 0.22 }}
      >
        SKU {sku}
      </motion.p>
      {product.shortDescription && (
        <motion.p
          className="sf-pdp-lede"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={fade}
          transition={{ duration: duration.base, ease, delay: 0.26 }}
        >
          {product.shortDescription}
        </motion.p>
      )}

      <motion.hr
        className="sf-pdp-rule"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.42, ease, delay: 0.3 }}
      />

      <motion.div
        className="sf-price-box"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={fade}
        transition={{ duration: duration.base, ease, delay: 0.38 }}
      >
        {!showPrices ? (
          <p>Price available to approved buyers</p>
        ) : price ? (
          <p className="sf-pdp-price">{formatMoney(price.amount)}</p>
        ) : variable && !variant ? (
          <p>Select options to see price</p>
        ) : (
          <p>This option is not priced for your account.</p>
        )}
      </motion.div>

      {variable && <VariantPicker product={product} selected={selected} onChange={setSelected} />}

      <motion.hr
        className="sf-pdp-rule"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.42, ease, delay: 0.44 }}
      />

      <motion.div
        className="sf-pdp-utility"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={fade}
        transition={{ duration: duration.base, ease, delay: 0.56 }}
      >
        {(!variable || variant) && (
          <p className="sf-count">{inStock ? "Available to supply" : "Currently unavailable"}</p>
        )}
        <p className="sf-count">Minimum order: {product.minOrderQuantity}</p>
      </motion.div>

      {notice && <p>{notice}</p>}
      {error && <p className="error">{error}</p>}

      <motion.div
        className="sf-pdp-action"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={fade}
        transition={{ duration: duration.base, ease, delay: 0.62 }}
      >
        {showPrices && price && inStock ? (
          <AddToCartForm
            productId={product.id}
            variantId={variant?.id}
            minOrderQuantity={product.minOrderQuantity}
            next={`/products/${product.slug}`}
            inStock={inStock}
          />
        ) : !showPrices ? (
          <ButtonLink href={requestHref}>Request a trade account</ButtonLink>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function usePanelShift(reduce: boolean | null) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.18], [0, reduce ? 0 : -12]);
  return reduce ? undefined : { y };
}
