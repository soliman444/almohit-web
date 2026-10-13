import { BadRequestException } from "@nestjs/common";
import type { PlaceOrderRequest } from "@almohit/contracts";
import { INVALID_ADDRESS, INVALID_PAYMENT_METHOD } from "./checkout.errors";

const PAYMENT_METHODS = new Set(["CASH", "BANK_TRANSFER", "MANUAL"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: unknown): string | undefined {
  const trimmed = text(value);
  return trimmed || undefined;
}

export function parsePlaceOrderInput(body: Record<string, unknown> | null | undefined): PlaceOrderRequest {
  const nested = body?.address && typeof body.address === "object" ? (body.address as Record<string, unknown>) : null;
  const paymentMethod = text(body?.paymentMethod) || "BANK_TRANSFER";
  if (!PAYMENT_METHODS.has(paymentMethod)) throw new BadRequestException(INVALID_PAYMENT_METHOD);

  const recipient = text(nested?.recipient ?? body?.recipient);
  const line1 = text(nested?.line1 ?? body?.line1);
  const city = text(nested?.city ?? body?.city);
  const country = text(nested?.country ?? body?.country) || "SA";
  const cartId = text(body?.cartId);
  if (!cartId || !recipient || !line1 || !city || !country) throw new BadRequestException(INVALID_ADDRESS);

  return {
    cartId,
    addressId: optional(body?.addressId),
    saveAddress: body?.saveAddress === true || body?.saveAddress === "on" || body?.saveAddress === "true",
    recipient,
    phone: optional(nested?.phone ?? body?.phone),
    line1,
    line2: optional(nested?.line2 ?? body?.line2),
    city,
    region: optional(nested?.region ?? body?.region),
    postalCode: optional(nested?.postalCode ?? body?.postalCode),
    country,
    customerNotes: optional(body?.customerNotes),
    paymentMethod: paymentMethod as PlaceOrderRequest["paymentMethod"],
  };
}
