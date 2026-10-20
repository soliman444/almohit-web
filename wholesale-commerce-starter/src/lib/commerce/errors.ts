export {
  COMMERCE_ERROR_CODES,
  CommerceError,
  isCommerceErrorCode,
  type CommerceErrorCode,
} from "../odoo/errors";

import {
  CommerceError,
  isCommerceErrorCode,
  type CommerceErrorCode,
} from "../odoo/errors";

const MESSAGES: Record<CommerceErrorCode, string> = {
  UNAPPROVED: "Your account is no longer approved for purchasing.",
  QUANTITY: "Enter a valid quantity.",
  PRODUCT: "This product is no longer available.",
  UNAVAILABLE: "This product is no longer available.",
  PRICE: "A price is no longer available for your account.",
  MINIMUM: "Quantity is below the minimum order.",
  STOCK: "Not enough stock. Reduce the quantity and try again.",
  ITEM: "That cart item was not found.",
  EMPTY: "Your cart is empty.",
  ADDRESS: "Enter a valid delivery address.",
  TRANSITION: "That order status change is not allowed.",
  ORDER: "Order not found.",
  CANCELLED: "This order is cancelled.",
  AMOUNT: "Enter a valid payment amount.",
  OVERPAY: "Payment would exceed the order total.",
  CHECKOUT: "Checkout could not be completed.",
  CART: "The cart could not be updated.",
  VARIANT: "Select an available product option.",
  INVOICE: "Invoice not found.",
  PAYMENT: "That payment could not be completed.",
  PAID: "This invoice is already paid.",
  SERVICE_UNAVAILABLE: "The store service is temporarily unavailable. Please try again shortly.",
};

function formatUnits(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(2)));
}

export function commerceMessage(error: unknown, minQty?: string | number, availableQty?: string | number) {
  const code = commerceErrorCode(error);
  if (code === "MINIMUM") {
    const quantity = minQty
      ?? (error instanceof CommerceError ? error.details?.minOrderQuantity : undefined);
    if (quantity != null && String(quantity).trim()) {
      return `Quantity is below the minimum order (${formatUnits(quantity)}).`;
    }
  }
  if (code === "STOCK") {
    const available = availableQty
      ?? (error instanceof CommerceError ? error.details?.availableQuantity : undefined);
    if (available != null && String(available).trim() && Number(available) >= 0) {
      return `Only ${formatUnits(available)} units are available.`;
    }
  }
  if (error instanceof CommerceError) return MESSAGES[error.code];
  if (error instanceof Error && isCommerceErrorCode(error.message)) return MESSAGES[error.message];
  if (typeof error === "string" && isCommerceErrorCode(error)) return MESSAGES[error];
  return MESSAGES.CART;
}

export function commerceErrorCode(error: unknown): CommerceErrorCode {
  if (error instanceof CommerceError) return error.code;
  if (error instanceof Error && error.name === "ApiUnavailableError") return "SERVICE_UNAVAILABLE";
  if (error instanceof Error && isCommerceErrorCode(error.message)) return error.message;
  if (typeof error === "string" && isCommerceErrorCode(error)) return error;
  return "CART";
}
