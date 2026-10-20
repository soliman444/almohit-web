import type { StorefrontProduct } from "./catalog/types";

export function storefrontCartProductId(
  product: Pick<StorefrontProduct, "id" | "productType" | "variants">,
  selectedVariantId?: string | null,
): string | null {
  const variants = product.variants ?? [];
  if (product.productType === "VARIABLE") {
    if (!selectedVariantId) return null;
    return variants.some((variant) => variant.id === selectedVariantId) ? selectedVariantId : null;
  }
  if (selectedVariantId && variants.some((variant) => variant.id === selectedVariantId)) {
    return selectedVariantId;
  }
  return variants[0]?.id ?? null;
}
