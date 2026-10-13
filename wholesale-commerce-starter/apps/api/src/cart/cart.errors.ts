export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const CART_UNAVAILABLE = {
  code: "CART_UNAVAILABLE",
  message: "The cart could not be updated",
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

export const CART_ITEM_NOT_FOUND = {
  code: "CART_ITEM_NOT_FOUND",
  message: "That cart item was not found",
} as const;

export const INVALID_QUANTITY = {
  code: "INVALID_QUANTITY",
  message: "Enter a valid quantity",
} as const;
