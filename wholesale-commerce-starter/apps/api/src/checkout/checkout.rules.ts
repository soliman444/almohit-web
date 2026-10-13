import { randomBytes } from "node:crypto";
import { Prisma } from "@almohit/database";

export function nextOrderNumber() {
  return `ORD-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function resolveLockedCartCheckout(cart: {
  status: string;
  order?: { orderNumber: string } | null;
}): "proceed" | "existing" | "invalid" {
  if (cart.status === "CONVERTED" && cart.order?.orderNumber) return "existing";
  if (cart.status === "ACTIVE") return "proceed";
  return "invalid";
}

export function variantDisplayName(values: Array<{ value: string }>) {
  return values.map((item) => item.value).join(" / ");
}

export function attributeSnapshot(values: Array<{ attributeName: string; value: string }>) {
  return values.map((item) => ({ name: item.attributeName, value: item.value }));
}

export function money(value: Prisma.Decimal | string) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function moneySum(values: Prisma.Decimal[]) {
  return values.reduce((sum, value) => sum.add(value), new Prisma.Decimal("0.00"));
}

export function lineTotal(unitPrice: Prisma.Decimal, quantity: number) {
  return unitPrice.mul(quantity);
}
