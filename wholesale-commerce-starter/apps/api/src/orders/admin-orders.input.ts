import type { OrderStatusName } from "@almohit/contracts";
import { isOrderStatus } from "./orders.rules";

const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

export type AdminOrderListQuery = {
  q: string;
  status?: OrderStatusName;
  payment?: (typeof PAYMENT_STATUSES)[number];
  page: number;
  pageSize: number;
};

export function parseAdminOrderListQuery(query: Record<string, unknown>): AdminOrderListQuery {
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const status = typeof query.status === "string" && isOrderStatus(query.status) ? query.status : undefined;
  const payment =
    typeof query.payment === "string" && (PAYMENT_STATUSES as readonly string[]).includes(query.payment)
      ? (query.payment as AdminOrderListQuery["payment"])
      : undefined;
  return {
    q,
    status,
    payment,
    page: toPositiveInt(query.page, DEFAULT_PAGE),
    pageSize: Math.min(toPositiveInt(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

export function parseAdminNotesInput(body: Record<string, unknown>): string | null {
  if (typeof body.adminNotes !== "string") return null;
  const adminNotes = body.adminNotes.trim();
  return adminNotes ? adminNotes : null;
}

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}
