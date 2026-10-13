import { ApiClientError, ApiUnavailableError } from "../api/client";
import { CommerceError } from "../commerce-errors";
import { mapOdooCartError } from "./cart";
import { mapOdooOrder, type OdooOrderPayload, type StorefrontOrderDetail } from "./orders";
import { odooRequest } from "./client";
import type { OdooCookieAdapter } from "./types";

export type OdooCheckoutInput = {
  shipping_address_id: number;
  invoice_address_id: number;
};

export function odooCheckoutPayload(shippingAddressId: number, invoiceAddressId: number): OdooCheckoutInput {
  return {
    shipping_address_id: shippingAddressId,
    invoice_address_id: invoiceAddressId,
  };
}

export function mapOdooCheckoutError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiUnavailableError) return new CommerceError("SERVICE_UNAVAILABLE");
  if (error instanceof ApiClientError) {
    if (error.code === "CART_NOT_FOUND" || error.code === "CART_EMPTY") {
      return new CommerceError("EMPTY");
    }
    if (error.code === "CART_ALREADY_CHECKED_OUT" || error.code === "CHECKOUT_FAILED") {
      return new CommerceError("CHECKOUT");
    }
    if (error.code === "ADDRESS_NOT_FOUND" || error.code === "ADDRESS_TYPE_INVALID") {
      return new CommerceError("ADDRESS");
    }
    if (error.code === "INSUFFICIENT_STOCK") {
      return mapOdooCartError(error);
    }
    if (error.code === "MIN_ORDER_QUANTITY_NOT_MET") {
      return mapOdooCartError(error);
    }
    if (error.code === "PRODUCT_UNAVAILABLE" || error.code === "PRODUCT_NOT_FOUND") {
      return new CommerceError("PRODUCT");
    }
    if (error.code === "WHOLESALE_APPROVAL_REQUIRED" || error.code === "UNAUTHENTICATED") {
      return new CommerceError("UNAPPROVED");
    }
    return new CommerceError("CHECKOUT");
  }
  return new CommerceError("CHECKOUT");
}

export async function checkoutOdooCart(
  input: OdooCheckoutInput,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontOrderDetail> {
  const payload = await odooRequest<OdooOrderPayload>("/checkout", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: odooCheckoutPayload(input.shipping_address_id, input.invoice_address_id),
  });
  return mapOdooOrder(payload);
}
