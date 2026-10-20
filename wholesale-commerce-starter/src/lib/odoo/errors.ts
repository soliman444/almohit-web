export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get statusCode() {
    return this.status;
  }
}

export class ApiUnavailableError extends Error {
  readonly code = "API_UNAVAILABLE";

  constructor(cause?: unknown) {
    super("API_UNAVAILABLE", { cause });
    this.name = "ApiUnavailableError";
  }
}

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
  "INVOICE",
  "PAYMENT",
  "PAID",
  "SERVICE_UNAVAILABLE",
] as const;

export type CommerceErrorCode = (typeof COMMERCE_ERROR_CODES)[number];

export class CommerceError extends Error {
  readonly code: CommerceErrorCode;
  readonly details?: { minOrderQuantity?: number; availableQuantity?: number };

  constructor(code: CommerceErrorCode, details?: { minOrderQuantity?: number; availableQuantity?: number }) {
    super(code);
    this.name = "CommerceError";
    this.code = code;
    this.details = details;
  }
}

export function isCommerceErrorCode(value: string): value is CommerceErrorCode {
  return (COMMERCE_ERROR_CODES as readonly string[]).includes(value);
}
