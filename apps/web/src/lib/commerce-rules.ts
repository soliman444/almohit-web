import { randomBytes } from "node:crypto";
import type { CartStatus, OrderStatus, PaymentStatus } from "@almohit/database";
import { CommerceError, type CommerceErrorCode } from "./commerce-errors";
import { money, moneyZero, type Money } from "./money";

export const ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "SHIPPED",
  "DELIVERED",
];

export function allowedOrderTransitions(from: OrderStatus): OrderStatus[] {
  if (from === "DELIVERED" || from === "CANCELLED") return [];
  const next = ORDER_FLOW[ORDER_FLOW.indexOf(from) + 1];
  return next ? [next, "CANCELLED"] : ["CANCELLED"];
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!allowedOrderTransitions(from).includes(to)) {
    throw new CommerceError("TRANSITION");
  }
}

export function canReserveStock(quantity: number, reservedQuantity: number, requested: number) {
  return Number.isInteger(requested) && requested > 0 && quantity - reservedQuantity >= requested;
}

export function applyReserveStock(quantity: number, reservedQuantity: number, requested: number) {
  if (!canReserveStock(quantity, reservedQuantity, requested)) throw new CommerceError("STOCK");
  return { quantity, reservedQuantity: reservedQuantity + requested };
}

export function applyReleaseStock(quantity: number, reservedQuantity: number, requested: number) {
  if (!Number.isInteger(requested) || requested <= 0 || reservedQuantity < requested) {
    throw new CommerceError("STOCK");
  }
  return { quantity, reservedQuantity: reservedQuantity - requested };
}

export function applyFulfillStock(quantity: number, reservedQuantity: number, requested: number) {
  if (
    !Number.isInteger(requested) ||
    requested <= 0 ||
    quantity < requested ||
    reservedQuantity < requested
  ) {
    throw new CommerceError("STOCK");
  }
  return { quantity: quantity - requested, reservedQuantity: reservedQuantity - requested };
}

export function paidTotalFromPayments(payments: Array<{ status: PaymentStatus; amount: Money | string | number }>) {
  return payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum.add(money(payment.amount)), moneyZero());
}

export function paymentStatusFromPaid(paid: Money | string | number, total: Money | string | number): PaymentStatus {
  const paidAmount = money(paid);
  const orderTotal = money(total);
  if (paidAmount.lte(0)) return "PENDING";
  if (paidAmount.lt(orderTotal)) return "PARTIAL";
  return "PAID";
}

export function remainingPayable(paid: Money | string | number, total: Money | string | number) {
  const remaining = money(total).sub(money(paid));
  return remaining.lt(0) ? moneyZero() : remaining;
}

export function assertPaymentAmount(
  amount: Money | string | number,
  paid: Money | string | number,
  total: Money | string | number,
) {
  const next = money(amount);
  if (next.lte(0)) throw new CommerceError("AMOUNT");
  if (next.gt(remainingPayable(paid, total))) throw new CommerceError("OVERPAY");
  return next;
}

export type CartCheckoutState =
  | { type: "proceed" }
  | { type: "existing"; orderNumber: string }
  | { type: "invalid" };

export function resolveLockedCartCheckout(cart: {
  status: CartStatus;
  order?: { orderNumber: string } | null;
}): CartCheckoutState {
  if (cart.status === "CONVERTED" && cart.order?.orderNumber) {
    return { type: "existing", orderNumber: cart.order.orderNumber };
  }
  if (cart.status === "ACTIVE") return { type: "proceed" };
  return { type: "invalid" };
}

export type CartItemIssue = Extract<
  CommerceErrorCode,
  "UNAVAILABLE" | "STOCK" | "MINIMUM" | "PRICE"
>;

export function cartItemIssue(input: {
  productActive: boolean;
  categoryActive: boolean;
  quantity: number;
  minOrderQuantity: number;
  available: number;
  hasPrice: boolean;
}): CartItemIssue | null {
  if (!input.productActive || !input.categoryActive) return "UNAVAILABLE";
  if (!input.hasPrice) return "PRICE";
  if (input.quantity < input.minOrderQuantity) return "MINIMUM";
  if (input.quantity > input.available) return "STOCK";
  return null;
}

export { sameCartSku } from "./variant-rules";

export function nextOrderNumber() {
  return `ORD-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002",
  );
}
