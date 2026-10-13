export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const PERMISSION_DENIED = {
  code: "PERMISSION_DENIED",
  message: "Permission denied",
} as const;

export const ORDER_NOT_FOUND = {
  code: "ORDER_NOT_FOUND",
  message: "Order not found",
} as const;

export const ORDER_CANCELLED = {
  code: "ORDER_CANCELLED",
  message: "This order is cancelled",
} as const;

export const INVALID_AMOUNT = {
  code: "INVALID_AMOUNT",
  message: "Enter a valid payment amount",
} as const;

export const OVERPAY = {
  code: "OVERPAY",
  message: "Payment would exceed the order total",
} as const;

export const INVALID_PAYMENT_METHOD = {
  code: "INVALID_PAYMENT_METHOD",
  message: "Choose a valid payment method",
} as const;
