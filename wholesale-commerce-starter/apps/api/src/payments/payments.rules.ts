import { Prisma } from "@almohit/database";

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MANUAL"] as const;
export type PaymentMethodName = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethodName {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paidTotal(payments: Array<{ status: string; amount: Prisma.Decimal }>) {
  return payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal("0.00"));
}

export function remainingPayable(paid: Prisma.Decimal, total: Prisma.Decimal) {
  const remaining = total.sub(paid);
  return remaining.lt(0) ? new Prisma.Decimal("0.00") : remaining;
}

export function paymentStatusFromPaid(paid: Prisma.Decimal, total: Prisma.Decimal) {
  if (paid.lte(0)) return "PENDING" as const;
  if (paid.lt(total)) return "PARTIAL" as const;
  return "PAID" as const;
}

export function wouldOverpay(amount: Prisma.Decimal, paid: Prisma.Decimal, total: Prisma.Decimal) {
  return amount.gt(remainingPayable(paid, total));
}

export function parseDecimalAmount(value: unknown): Prisma.Decimal | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return new Prisma.Decimal(text);
}
