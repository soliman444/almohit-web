export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const CUSTOMER_REQUIRED = {
  code: "CUSTOMER_REQUIRED",
  message: "A customer account is required",
} as const;

export const ORDER_NOT_FOUND = {
  code: "ORDER_NOT_FOUND",
  message: "Order not found",
} as const;

export const PERMISSION_DENIED = {
  code: "PERMISSION_DENIED",
  message: "Permission denied",
} as const;

export const ORDER_STATUS_INVALID = {
  code: "ORDER_STATUS_INVALID",
  message: "That order status change is not allowed",
} as const;

export const ORDER_CANNOT_CANCEL = {
  code: "ORDER_CANNOT_CANCEL",
  message: "This order cannot be cancelled",
} as const;

export const ORDER_CONFLICT = {
  code: "ORDER_CONFLICT",
  message: "That order status change is not allowed",
} as const;

export const INVENTORY_CONFLICT = {
  code: "INVENTORY_CONFLICT",
  message: "Stock changed. Reduce the quantity and try again",
} as const;
