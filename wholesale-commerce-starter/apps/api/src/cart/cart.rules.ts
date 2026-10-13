import type { CartItemIssueCode } from "@almohit/contracts";

export function availableQuantity(quantity: number, reservedQuantity: number) {
  return Math.max(0, quantity - reservedQuantity);
}

export function cartItemIssue(input: {
  productActive: boolean;
  categoryActive: boolean;
  quantity: number;
  minOrderQuantity: number;
  available: number;
  hasPrice: boolean;
}): CartItemIssueCode | null {
  if (!input.productActive || !input.categoryActive) return "UNAVAILABLE";
  if (!input.hasPrice) return "PRICE";
  if (input.quantity < input.minOrderQuantity) return "MINIMUM";
  if (input.quantity > input.available) return "STOCK";
  return null;
}

export function variantKey(variantId?: string | null) {
  return variantId ?? "";
}

export function sameCartSku(
  left: { productId: string; variantId?: string | null },
  right: { productId: string; variantId?: string | null },
) {
  return left.productId === right.productId && variantKey(left.variantId) === variantKey(right.variantId);
}

export function selectionError(input: {
  productType: "SIMPLE" | "VARIABLE";
  productId: string;
  variantId?: string | null;
  variantProductId?: string | null;
  variantStatus?: string | null;
}): "VARIANT_NOT_FOUND" | "PRODUCT_UNAVAILABLE" | null {
  if (input.productType === "SIMPLE") {
    return input.variantId ? "VARIANT_NOT_FOUND" : null;
  }
  if (!input.variantId) return "VARIANT_NOT_FOUND";
  if (input.variantProductId !== input.productId) return "VARIANT_NOT_FOUND";
  if (input.variantStatus !== "ACTIVE") return "PRODUCT_UNAVAILABLE";
  return null;
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
  );
}

export function parseQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isInteger(Number(value))) return Number(value);
  return null;
}
