import type { PlaceOrderRequest, PlaceOrderResponse } from "@almohit/contracts";
import { apiPost } from "./client";

export async function placeOrder(input: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  return apiPost<PlaceOrderResponse>("/checkout/place-order", {
    cartId: input.cartId,
    ...(input.addressId ? { addressId: input.addressId } : {}),
    saveAddress: Boolean(input.saveAddress),
    recipient: input.recipient,
    phone: input.phone ?? undefined,
    line1: input.line1,
    line2: input.line2 ?? undefined,
    city: input.city,
    region: input.region ?? undefined,
    postalCode: input.postalCode ?? undefined,
    country: input.country ?? "SA",
    customerNotes: input.customerNotes ?? undefined,
    paymentMethod: input.paymentMethod,
  });
}
