import type { CartView, CartViewItem } from "./cart-view";
import { parseOdooRecordId } from "../odoo/catalog";
import { ApiClientError } from "../odoo/errors";
import { formatOdooAmount, type OdooCartLinePayload, type OdooCartPayload } from "../odoo/cart";

export async function getCurrentCart(): Promise<CartView | null> {
  if (!(await usingOdooCart())) return null;
  const { getOdooCart, isCartAccessDenied } = await import("../odoo/cart");
  try {
    return mapOdooCart(await getOdooCart());
  } catch (error) {
    if (isCartAccessDenied(error)) return null;
    throw error;
  }
}

export async function addCartItem(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}): Promise<CartView | null> {
  await requireOdooCart();
  const { addOdooCartItem } = await import("../odoo/cart");
  const productId = parseOdooRecordId(input.productId);
  if (!productId) {
    throw new ApiClientError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  return mapOdooCart(await addOdooCartItem({ product_id: productId, quantity: input.quantity }));
}

export async function updateCartItem(itemId: string, input: { quantity: number }): Promise<CartView | null> {
  await requireOdooCart();
  const { updateOdooCartItem } = await import("../odoo/cart");
  const lineId = parseOdooRecordId(itemId);
  if (!lineId) {
    throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
  }
  return mapOdooCart(await updateOdooCartItem(lineId, input.quantity));
}

export async function removeCartItem(itemId: string): Promise<CartView | null> {
  await requireOdooCart();
  const { removeOdooCartItem } = await import("../odoo/cart");
  const lineId = parseOdooRecordId(itemId);
  if (!lineId) {
    throw new ApiClientError(404, "CART_LINE_NOT_FOUND", "Cart line not found.");
  }
  return mapOdooCart(await removeOdooCartItem(lineId));
}

export async function clearCart(): Promise<CartView | null> {
  await requireOdooCart();
  const { clearOdooCart } = await import("../odoo/cart");
  return mapOdooCart(await clearOdooCart());
}

function mapOdooCart(payload: OdooCartPayload): CartView {
  const currency = payload.currency?.name || "USD";
  const items = (payload.items ?? []).map((item) => mapOdooCartItem(item, currency));
  const amountUntaxed = formatOdooAmount(payload.amount_untaxed);
  const amountTax = formatOdooAmount(payload.amount_tax);
  const amountTotal = formatOdooAmount(payload.amount_total);
  return {
    id: payload.id != null ? String(payload.id) : "",
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: amountUntaxed,
    currency,
    canCheckout: items.length > 0 && items.every((item) => !item.issue),
    items,
    amountUntaxed,
    amountTax,
    amountTotal,
  };
}

function mapOdooCartItem(item: OdooCartLinePayload, currency: string): CartViewItem {
  const templateId = String(item.template_id);
  const productId = String(item.product_id);
  return {
    id: String(item.line_id),
    productId: templateId,
    variantId: productId,
    variantName: null,
    name: item.name,
    slug: templateId,
    sku: item.default_code || productId,
    quantity: item.quantity,
    minOrderQuantity: typeof item.min_order_qty === "number" ? item.min_order_qty : 1,
    available: typeof item.available_qty === "number" && Number.isFinite(item.available_qty) ? item.available_qty : 0,
    unitPrice: formatOdooAmount(item.unit_price),
    lineTotal: formatOdooAmount(item.subtotal),
    currency,
    image: null,
    issue: cartLineIssue(item),
    templateId,
    uom: item.uom?.name ?? null,
  };
}

function cartLineIssue(item: OdooCartLinePayload): CartViewItem["issue"] {
  const available = typeof item.available_qty === "number" && Number.isFinite(item.available_qty)
    ? item.available_qty
    : null;
  if (available != null && item.quantity > available) return "STOCK";
  return null;
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
