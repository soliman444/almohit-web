import type { OrderStatusName } from "@almohit/contracts";
import { Prisma } from "@almohit/database";

export const ORDER_FLOW = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "SHIPPED",
  "DELIVERED",
] as const;

export const ORDER_STATUSES = [...ORDER_FLOW, "CANCELLED"] as const satisfies readonly OrderStatusName[];

export function allowedOrderTransitions(from: string): OrderStatusName[] {
  if (from === "DELIVERED" || from === "CANCELLED") return [];
  const next = ORDER_FLOW[ORDER_FLOW.indexOf(from as (typeof ORDER_FLOW)[number]) + 1];
  return next ? [next, "CANCELLED"] : ["CANCELLED"];
}

export function canTransition(from: string, to: string) {
  return allowedOrderTransitions(from).includes(to as OrderStatusName);
}

export function isOrderStatus(value: string): value is OrderStatusName {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export function parseOrderListQuery(query: Record<string, unknown>) {
  return {
    page: toPositiveInt(query.page, DEFAULT_PAGE),
    pageSize: Math.min(toPositiveInt(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

export function parseAttributeSnapshot(value: unknown): Array<{ name: string; value: string }> {
  if (!Array.isArray(value)) return [];
  const attributes: Array<{ name: string; value: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { name?: unknown; value?: unknown };
    const name = typeof record.name === "string" ? record.name : "";
    const parsed = typeof record.value === "string" ? record.value : "";
    if (!name && !parsed) continue;
    attributes.push({ name, value: parsed });
  }
  return attributes;
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

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}
