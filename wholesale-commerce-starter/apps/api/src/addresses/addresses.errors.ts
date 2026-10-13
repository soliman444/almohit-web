export const AUTH_REQUIRED = {
  code: "AUTH_REQUIRED",
  message: "Authentication required",
} as const;

export const CUSTOMER_REQUIRED = {
  code: "CUSTOMER_REQUIRED",
  message: "A customer account is required",
} as const;

export const ADDRESS_NOT_FOUND = {
  code: "ADDRESS_NOT_FOUND",
  message: "Address not found",
} as const;

export const INVALID_ADDRESS = {
  code: "INVALID_ADDRESS",
  message: "Enter a valid delivery address",
} as const;
