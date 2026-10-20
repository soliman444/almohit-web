"use server";

import { requireMerchant } from "../session/access";
import { addCartItem, clearCart, removeCartItem, updateCartItem } from "../commerce/cart";
import { ApiClientError } from "../odoo/errors";
import { CommerceError, type CommerceErrorCode } from "../commerce/errors";
import { mapOdooCartError } from "../odoo/cart";
import type { CartMutationResult, CartView } from "../commerce/cart-view";
import { mapUnavailable, revalidateStore, value } from "./shared";

export type { CartMutationResult };

function mapCartApiError(error: unknown): CommerceError {
  const unavailable = mapUnavailable(error);
  if (unavailable) return unavailable;
  if (error instanceof ApiClientError) {
    if (
      error.code === "MIN_ORDER_QUANTITY_NOT_MET"
      || error.code === "WHOLESALE_APPROVAL_REQUIRED"
      || error.code === "PRODUCT_NOT_FOUND"
      || error.code === "PRODUCT_UNAVAILABLE"
      || error.code === "CART_LINE_NOT_FOUND"
      || error.code === "INSUFFICIENT_STOCK"
      || error.code === "INVALID_QUANTITY"
    ) {
      return mapOdooCartError(error);
    }
    const mapped: Record<string, CommerceErrorCode> = {
      AUTH_REQUIRED: "UNAPPROVED",
      PRICE_ACCESS_DENIED: "UNAPPROVED",
      PRODUCT_UNAVAILABLE: "PRODUCT",
      VARIANT_NOT_FOUND: "VARIANT",
      PRICE_UNAVAILABLE: "PRICE",
      MOQ_NOT_MET: "MINIMUM",
      INSUFFICIENT_STOCK: "STOCK",
      CART_ITEM_NOT_FOUND: "ITEM",
      CART_UNAVAILABLE: "CART",
      INVALID_QUANTITY: "QUANTITY",
    };
    return new CommerceError(mapped[error.code] ?? "CART");
  }
  return error instanceof CommerceError ? error : new CommerceError("CART");
}

async function runCartMutation(run: () => Promise<CartView | null>): Promise<CartMutationResult> {
  try {
    const cart = await run();
    revalidateStore();
    return { ok: true, cart };
  } catch (error) {
    const mapped = mapCartApiError(error);
    return {
      ok: false,
      error: mapped.code,
      minOrderQuantity: mapped.details?.minOrderQuantity,
      availableQuantity: mapped.details?.availableQuantity,
    };
  }
}

export async function addToCartAction(formData: FormData): Promise<CartMutationResult> {
  await requireMerchant();
  const quantity = Number(value(formData, "quantity") || "1");
  return runCartMutation(() => addCartItem({
    productId: value(formData, "productId"),
    quantity,
    variantId: value(formData, "variantId") || null,
  }));
}

export async function updateCartItemQuantityAction(formData: FormData): Promise<CartMutationResult> {
  await requireMerchant();
  return runCartMutation(() => updateCartItem(value(formData, "itemId"), {
    quantity: Number(value(formData, "quantity")),
  }));
}

export async function removeCartItemAction(formData: FormData): Promise<CartMutationResult> {
  await requireMerchant();
  return runCartMutation(() => removeCartItem(value(formData, "itemId")));
}

export async function clearCartAction(_formData?: FormData): Promise<CartMutationResult> {
  await requireMerchant();
  return runCartMutation(() => clearCart());
}
