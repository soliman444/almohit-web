import { BadRequestException } from "@nestjs/common";
import { INVALID_QUANTITY } from "./cart.errors";
import { parseQuantity } from "./cart.rules";

export function parseAddCartItem(body: Record<string, unknown> | null | undefined) {
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    throw new BadRequestException({ code: "INVALID_REQUEST", message: "Invalid request" });
  }
  const quantity = parseQuantity(body?.quantity);
  if (quantity === null || quantity < 1) throw new BadRequestException(INVALID_QUANTITY);
  const rawVariant = body?.variantId;
  const variantId = typeof rawVariant === "string" && rawVariant.trim() ? rawVariant.trim() : null;
  return { productId, variantId, quantity };
}

export function parseUpdateCartItem(body: Record<string, unknown> | null | undefined) {
  const quantity = parseQuantity(body?.quantity);
  if (quantity === null || quantity < 1) throw new BadRequestException(INVALID_QUANTITY);
  return { quantity };
}
