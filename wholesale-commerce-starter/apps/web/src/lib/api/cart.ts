import type { AddCartItemRequest, CartDto, CartItemDto, CurrentCartResponse, UpdateCartItemRequest } from "@almohit/contracts";
import type { CartView, CartViewItem } from "../commerce";
import { parseOdooRecordId } from "../odoo/catalog";
import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "./client";

function toCartViewItem(item: CartItemDto): CartViewItem {
  return {
    id: item.id,
    productId: item.product.id,
    variantId: item.variant?.id ?? null,
    variantName: item.variant?.name ?? null,
    name: item.product.name,
    slug: item.product.slug,
    sku: item.variant?.sku ?? item.product.sku,
    quantity: item.quantity,
    minOrderQuantity: item.moq,
    available: item.availableQuantity,
    unitPrice: item.unitPrice?.amount ?? "",
    lineTotal: item.lineTotal?.amount ?? "",
    currency: item.unitPrice?.currency ?? item.lineTotal?.currency ?? "USD",
    image: item.product.image,
    issue: item.reason,
  };
}

export function toCartView(cart: CartDto): CartView {
  return {
    id: cart.id,
    itemCount: cart.itemCount,
    subtotal: cart.totals.subtotal?.amount ?? "0.00",
    currency: cart.totals.subtotal?.currency ?? "USD",
    canCheckout: cart.canCheckout,
    items: cart.items.map(toCartViewItem),
  };
}

export async function getCurrentCart(): Promise<CartView | null> {
  if (await usingOdooCart()) {
    const { getOdooCartView } = await import("../odoo/cart");
    return getOdooCartView();
  }
  const { hasApiSessionCookie } = await import("./client");
  if (!(await hasApiSessionCookie())) return null;
  try {
    const body = await apiGet<CurrentCartResponse>("/cart");
    return body.cart ? toCartView(body.cart) : null;
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 401) return null;
    throw error;
  }
}

export async function addCartItem(input: AddCartItemRequest): Promise<CartView | null> {
  if (await usingOdooCart()) {
    const { addOdooCartItem } = await import("../odoo/cart");
    const productId = parseOdooRecordId(input.productId);
    if (!productId) {
      throw new ApiClientError(404, "PRODUCT_NOT_FOUND", "Product not found.");
    }
    return addOdooCartItem({ product_id: productId, quantity: input.quantity });
  }
  const body = await apiPost<CurrentCartResponse>("/cart/items", {
    productId: input.productId,
    quantity: input.quantity,
    ...(input.variantId ? { variantId: input.variantId } : {}),
  });
  return body.cart ? toCartView(body.cart) : null;
}

export async function updateCartItem(itemId: string, input: UpdateCartItemRequest): Promise<CartView | null> {
  if (await usingOdooCart()) {
    const { updateOdooCartItem } = await import("../odoo/cart");
    const lineId = parseOdooRecordId(itemId);
    if (!lineId) {
      throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
    }
    return updateOdooCartItem(lineId, input.quantity);
  }
  const body = await apiPatch<CurrentCartResponse>(`/cart/items/${encodeURIComponent(itemId)}`, {
    quantity: input.quantity,
  });
  return body.cart ? toCartView(body.cart) : null;
}

export async function removeCartItem(itemId: string): Promise<CartView | null> {
  if (await usingOdooCart()) {
    const { removeOdooCartItem } = await import("../odoo/cart");
    const lineId = parseOdooRecordId(itemId);
    if (!lineId) {
      throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
    }
    return removeOdooCartItem(lineId);
  }
  const body = await apiDelete<CurrentCartResponse>(`/cart/items/${encodeURIComponent(itemId)}`);
  return body.cart ? toCartView(body.cart) : null;
}

export async function clearCart(): Promise<CartView | null> {
  if (await usingOdooCart()) {
    const { clearOdooCart } = await import("../odoo/cart");
    return clearOdooCart();
  }
  const body = await apiDelete<CurrentCartResponse>("/cart");
  return body.cart ? toCartView(body.cart) : null;
}

async function usingOdooCart() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}
