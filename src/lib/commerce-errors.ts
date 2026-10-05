export const COMMERCE_ERROR_CODES = [
  "UNAPPROVED",
  "QUANTITY",
  "PRODUCT",
  "UNAVAILABLE",
  "PRICE",
  "MINIMUM",
  "STOCK",
  "ITEM",
  "EMPTY",
  "ADDRESS",
  "TRANSITION",
  "ORDER",
  "CANCELLED",
  "AMOUNT",
  "OVERPAY",
  "CHECKOUT",
  "CART",
  "VARIANT",
] as const;

export type CommerceErrorCode = (typeof COMMERCE_ERROR_CODES)[number];

const MESSAGES: Record<CommerceErrorCode, string> = {
  UNAPPROVED: "Your account is no longer approved for purchasing.",
  QUANTITY: "Enter a valid quantity.",
  PRODUCT: "This product is no longer available.",
  UNAVAILABLE: "This product is no longer available.",
  PRICE: "A price is no longer available for your account.",
  MINIMUM: "Quantity is below the minimum order.",
  STOCK: "Stock changed. Reduce the quantity and try again.",
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
};

export class CommerceError extends Error {
  readonly code: CommerceErrorCode;

  constructor(code: CommerceErrorCode) {
    super(code);
    this.name = "CommerceError";
    this.code = code;
  }
}

export function isCommerceErrorCode(value: string): value is CommerceErrorCode {
  return (COMMERCE_ERROR_CODES as readonly string[]).includes(value);
}

export function commerceMessage(error: unknown) {
  if (error instanceof CommerceError) return MESSAGES[error.code];
  if (error instanceof Error && isCommerceErrorCode(error.message)) return MESSAGES[error.message];
  if (typeof error === "string" && isCommerceErrorCode(error)) return MESSAGES[error];
  return MESSAGES.CART;
}

export function commerceErrorCode(error: unknown): CommerceErrorCode {
  if (error instanceof CommerceError) return error.code;
  if (error instanceof Error && isCommerceErrorCode(error.message)) return error.message;
  if (typeof error === "string" && isCommerceErrorCode(error)) return error;
  return "CART";
}
