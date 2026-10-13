import type { MoneyDto } from "@almohit/contracts";
import { Prisma } from "@almohit/database";

export function serializeMoney(amount: { toFixed: (digits: number) => string }, currency: string): MoneyDto {
  return { amount: amount.toFixed(2), currency };
}

export function multiplyMoney(amount: string, quantity: number, currency: string): MoneyDto {
  return serializeMoney(new Prisma.Decimal(amount).mul(quantity), currency);
}
