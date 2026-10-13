import { Prisma } from "@almohit/database";

export type Money = Prisma.Decimal;

export function money(value: Prisma.Decimal | string | number): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("AMOUNT");
    return new Prisma.Decimal(value.toFixed(2));
  }
  return new Prisma.Decimal(value);
}

export function moneyText(value: Prisma.Decimal | string | number) {
  return money(value).toFixed(2);
}

export function moneyZero() {
  return new Prisma.Decimal("0.00");
}

export function moneySum(values: Array<Prisma.Decimal | string | number>) {
  return values.reduce<Prisma.Decimal>((sum, value) => sum.add(money(value)), moneyZero());
}

export function lineTotal(unitPrice: Prisma.Decimal | string | number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("QUANTITY");
  return money(unitPrice).mul(quantity);
}
