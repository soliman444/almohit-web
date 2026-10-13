export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const CUSTOMER_REQUIRED = {
  code: "CUSTOMER_REQUIRED",
  message: "A customer account is required",
} as const;

export const PRICE_ACCESS_DENIED = {
  code: "PRICE_ACCESS_DENIED",
  message: "Wholesale prices are not available for this account",
} as const;

export const CART_NOT_FOUND = {
  code: "CART_NOT_FOUND",
  message: "Your cart is empty",
} as const;

export const CART_NOT_ACTIVE = {
  code: "CART_NOT_ACTIVE",
  message: "Your cart is empty",
} as const;

export const CART_EMPTY = {
  code: "CART_EMPTY",
  message: "Your cart is empty",
} as const;

export const PRODUCT_UNAVAILABLE = {
  code: "PRODUCT_UNAVAILABLE",
  message: "This product is no longer available",
} as const;

export const VARIANT_NOT_FOUND = {
  code: "VARIANT_NOT_FOUND",
  message: "Variant is not available",
} as const;

export const PRICE_UNAVAILABLE = {
  code: "PRICE_UNAVAILABLE",
  message: "Price is not available",
} as const;

export const MOQ_NOT_MET = {
  code: "MOQ_NOT_MET",
  message: "Quantity is below the minimum order",
} as const;

export const INSUFFICIENT_STOCK = {
  code: "INSUFFICIENT_STOCK",
  message: "Stock changed. Reduce the quantity and try again",
} as const;

export const INVALID_QUANTITY = {
  code: "INVALID_QUANTITY",
  message: "Enter a valid quantity",
} as const;

export const ADDRESS_NOT_FOUND = {
  code: "ADDRESS_NOT_FOUND",
  message: "Enter a valid delivery address",
} as const;

export const INVALID_ADDRESS = {
  code: "INVALID_ADDRESS",
  message: "Enter a valid delivery address",
} as const;

export const INVALID_PAYMENT_METHOD = {
  code: "INVALID_PAYMENT_METHOD",
  message: "Checkout could not be completed",
} as const;

export const CHECKOUT_CONFLICT = {
  code: "CHECKOUT_CONFLICT",
  message: "Checkout could not be completed",
} as const;
