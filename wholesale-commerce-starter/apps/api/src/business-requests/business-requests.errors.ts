export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const PERMISSION_DENIED = {
  code: "PERMISSION_DENIED",
  message: "Permission denied",
} as const;

export const BUSINESS_REQUEST_NOT_FOUND = {
  code: "BUSINESS_REQUEST_NOT_FOUND",
  message: "Business request not found",
} as const;

export const BUSINESS_REQUEST_NOT_PENDING = {
  code: "BUSINESS_REQUEST_NOT_PENDING",
  message: "Business request is not pending",
} as const;

export const WHOLESALE_PRICE_GROUP_MISSING = {
  code: "WHOLESALE_PRICE_GROUP_MISSING",
  message: "Wholesale price group is missing",
} as const;
