import type { AddCartItemRequest, UpdateCartItemRequest } from "@almohit/contracts";
import type { CartView } from "../commerce";
import { parseOdooRecordId } from "../odoo/catalog";
import { ApiClientError } from "./client";

export async function getCurrentCart(): Promise<CartView | null> {
  if (!(await usingOdooCart())) return null;
  const { getOdooCartView } = await import("../odoo/cart");
  return getOdooCartView();
}

export async function addCartItem(input: AddCartItemRequest): Promise<CartView | null> {
  await requireOdooCart();
  const { addOdooCartItem } = await import("../odoo/cart");
  const productId = parseOdooRecordId(input.productId);
  if (!productId) {
    throw new ApiClientError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  return addOdooCartItem({ product_id: productId, quantity: input.quantity });
}

export async function updateCartItem(itemId: string, input: UpdateCartItemRequest): Promise<CartView | null> {
  await requireOdooCart();
  const { updateOdooCartItem } = await import("../odoo/cart");
  const lineId = parseOdooRecordId(itemId);
  if (!lineId) {
    throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
  }
  return updateOdooCartItem(lineId, input.quantity);
}

export async function removeCartItem(itemId: string): Promise<CartView | null> {
  await requireOdooCart();
  const { removeOdooCartItem } = await import("../odoo/cart");
  const lineId = parseOdooRecordId(itemId);
  if (!lineId) {
    throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
  }
  return removeOdooCartItem(lineId);
}

export async function clearCart(): Promise<CartView | null> {
  await requireOdooCart();
  const { clearOdooCart } = await import("../odoo/cart");
  return clearOdooCart();
}

async function usingOdooCart() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}

async function requireOdooCart() {
  if (!(await usingOdooCart())) {
    throw new ApiClientError(401, "AUTH_REQUIRED", "Sign in required.");
  }
}
