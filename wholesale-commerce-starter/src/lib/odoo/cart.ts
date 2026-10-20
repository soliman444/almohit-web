import { ApiClientError, CommerceError } from "./errors";
import { odooRequest } from "./client";
import type { OdooCookieAdapter } from "./types";

export type OdooCartCurrency = {
  id: number;
  name: string;
};

export type OdooCartUom = {
  id: number;
  name: string;
};

export type OdooCartLinePayload = {
  line_id: number;
  product_id: number;
  template_id: number;
  name: string;
  default_code?: string | null;
  quantity: number;
  uom?: OdooCartUom | null;
  min_order_qty?: number | null;
  available_qty?: number | null;
  unit_price: number;
  subtotal: number;
};

export type OdooCartPayload = {
  id: number | null;
  currency?: OdooCartCurrency | null;
  items: OdooCartLinePayload[];
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
};

export type OdooAddCartItemInput = {
  product_id: number;
  quantity: number;
};

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

export function odooAddItemPayload(productId: number, quantity: number): OdooAddCartItemInput {
  return {
    product_id: productId,
    quantity,
  };
}

export function formatOdooAmount(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

export function mapOdooCartError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiClientError) {
    if (error.code === "WHOLESALE_APPROVAL_REQUIRED" || error.code === "UNAUTHENTICATED") {
      return new CommerceError("UNAPPROVED");
    }
    if (error.code === "MIN_ORDER_QUANTITY_NOT_MET") {
      const minOrderQuantity = asFiniteNumber(error.details.min_order_qty);
      return new CommerceError(
        "MINIMUM",
        minOrderQuantity != null ? { minOrderQuantity } : undefined,
      );
    }
    if (error.code === "PRODUCT_NOT_FOUND" || error.code === "PRODUCT_UNAVAILABLE") {
      return new CommerceError("PRODUCT");
    }
    if (error.code === "CART_LINE_NOT_FOUND") {
      return new CommerceError("ITEM");
    }
    if (error.code === "INVALID_QUANTITY") {
      return new CommerceError("QUANTITY");
    }
    if (error.code === "INSUFFICIENT_STOCK") {
      const availableQuantity = asFiniteNumber(error.details.available_qty);
      return new CommerceError(
        "STOCK",
        availableQuantity != null ? { availableQuantity } : undefined,
      );
    }
    return new CommerceError("CART");
  }
  return new CommerceError("CART");
}

export async function getOdooCart(cookies?: OdooCookieAdapter): Promise<OdooCartPayload> {
  return odooRequest<OdooCartPayload>("/cart", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
}

export async function addOdooCartItem(
  input: OdooAddCartItemInput,
  cookies?: OdooCookieAdapter,
): Promise<OdooCartPayload> {
  return odooRequest<OdooCartPayload>("/cart/items", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: odooAddItemPayload(input.product_id, input.quantity),
  });
}

export async function updateOdooCartItem(
  lineId: number,
  quantity: number,
  cookies?: OdooCookieAdapter,
): Promise<OdooCartPayload> {
  return odooRequest<OdooCartPayload>(`/cart/items/${lineId}`, {
    method: "PATCH",
    cookies,
    captureSetCookie: false,
    body: { quantity },
  });
}

export async function removeOdooCartItem(
  lineId: number,
  cookies?: OdooCookieAdapter,
): Promise<OdooCartPayload> {
  return odooRequest<OdooCartPayload>(`/cart/items/${lineId}`, {
    method: "DELETE",
    cookies,
    captureSetCookie: false,
  });
}

export async function clearOdooCart(cookies?: OdooCookieAdapter): Promise<OdooCartPayload> {
  return odooRequest<OdooCartPayload>("/cart/clear", {
    method: "POST",
    cookies,
    captureSetCookie: false,
  });
}

export function isCartAccessDenied(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return (
    UNOAUTH_STATUSES.has(error.status)
    || error.code === "UNAUTHENTICATED"
    || error.code === "WHOLESALE_APPROVAL_REQUIRED"
    || error.code === "MARKETER_CANNOT_ORDER"
  );
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
