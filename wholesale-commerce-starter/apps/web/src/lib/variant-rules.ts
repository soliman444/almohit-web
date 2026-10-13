import { CommerceError } from "./commerce-errors";

export type ProductKind = "SIMPLE" | "VARIABLE";

export function variantKey(variantId?: string | null) {
  return variantId ?? "";
}

export function sameCartSku(
  left: { productId: string; variantId?: string | null },
  right: { productId: string; variantId?: string | null },
) {
  return left.productId === right.productId && variantKey(left.variantId) === variantKey(right.variantId);
}

export function combinationKey(valueIds: string[]) {
  return [...new Set(valueIds)].sort().join("|");
}

export function cartesianCombinations(groups: string[][]) {
  if (groups.length === 0 || groups.some((group) => group.length === 0)) return [];
  return groups.reduce<string[][]>((acc, group) => acc.flatMap((combo) => group.map((id) => [...combo, id])), [[]]);
}

export function variantDisplayName(values: Array<{ value: string }>) {
  return values.map((item) => item.value).join(" / ");
}

export function defaultVariantSku(productSku: string, valueSlugs: string[]) {
  return [productSku, ...valueSlugs]
    .join("-")
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function attributeSnapshot(values: Array<{ attributeName: string; value: string }>) {
  return values.map((item) => ({ name: item.attributeName, value: item.value }));
}

export function assertPurchasableSelection(input: {
  productType: ProductKind;
  productId: string;
  variantId?: string | null;
  variantProductId?: string | null;
  variantStatus?: string | null;
}) {
  if (input.productType === "SIMPLE") {
    if (input.variantId) throw new CommerceError("VARIANT");
    return;
  }
  if (!input.variantId) throw new CommerceError("VARIANT");
  if (input.variantProductId !== input.productId) throw new CommerceError("VARIANT");
  if (input.variantStatus !== "ACTIVE") throw new CommerceError("PRODUCT");
}

export function assertVariableCanActivate(activeVariantCount: number) {
  if (activeVariantCount < 1) throw new CommerceError("VARIANT");
}

export function publicVariantForVisitor(input: {
  id: string;
  name: string;
  sku: string;
  inStock: boolean;
  valueIds: string[];
  price?: { amount: string; currency: string } | null;
}) {
  return {
    id: input.id,
    name: input.name,
    sku: input.sku,
    inStock: input.inStock,
    valueIds: input.valueIds,
  };
}

export function authorizedVariantForBuyer(
  input: {
    id: string;
    name: string;
    sku: string;
    inStock: boolean;
    valueIds: string[];
  },
  price: { amount: string; currency: string } | null,
) {
  return {
    ...input,
    ...(price ? { price } : {}),
  };
}

export function payloadHasPriceLeak(payload: unknown) {
  const text = JSON.stringify(payload);
  return /priceGroupId|"amount":\s*"[0-9]/.test(text) && /priceGroupId/.test(text);
}
