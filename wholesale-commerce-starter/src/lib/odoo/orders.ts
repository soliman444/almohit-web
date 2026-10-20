import { cache } from "react";
import type { OrderDetailDto, OrderSummaryDto } from "@/types/contracts";
import { ApiClientError } from "./errors";
import { formatOdooAmount, type OdooCartCurrency, type OdooCartLinePayload } from "./cart";
import { mapOdooAddress, type OdooAddressPayload } from "./addresses";
import { odooRequest } from "./client";
import { mapPaymentTerm, type OdooCookieAdapter, type OdooPaymentTermPayload, type PaymentTerm } from "./types";

export type OdooOrderDeliveryPayload = {
  status?: string | null;
  picking_id?: number | null;
  reference?: string | null;
  scheduled_date?: string | null;
  date_done?: string | null;
};

export type OdooOrderInvoiceSummaryPayload = {
  id: number;
  name: string;
  state: string;
  payment_state?: string | null;
  amount_total: number;
};

export type OdooOrderPaymentPayload = {
  invoice_count?: number;
  state?: string | null;
};

export type OdooOrderPayload = {
  id: number;
  name?: string;
  state?: string;
  date_order?: string | null;
  currency?: OdooCartCurrency | null;
  items?: Array<OdooCartLinePayload>;
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  shipping_address?: OdooAddressPayload | null;
  invoice_address?: OdooAddressPayload | null;
  delivery?: OdooOrderDeliveryPayload | null;
  invoice_status?: string | null;
  invoices?: OdooOrderInvoiceSummaryPayload[];
  payment?: OdooOrderPaymentPayload | null;
  payment_term?: OdooPaymentTermPayload | null;
};

export type StorefrontOrderInvoice = {
  id: string;
  name: string;
  state: string;
  paymentState: string | null;
  amountTotal: string;
};

export type StorefrontOrderDetail = OrderDetailDto & {
  paymentTerm: PaymentTerm | null;
  deliveryStatus: string | null;
  deliveryReference: string | null;
  invoices: StorefrontOrderInvoice[];
  invoiceCount: number;
  billing: OrderDetailDto["shipping"] | null;
};

export type OdooOrderState = "sale" | "done" | "sent";
export type OdooOrderSort = "newest" | "oldest";

export type OdooOrderListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  state?: OdooOrderState;
  dateFrom?: string;
  dateTo?: string;
  sort?: OdooOrderSort;
};

export type StorefrontOrderPagination = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type StorefrontOrderList = {
  items: OrderSummaryDto[];
  pagination: StorefrontOrderPagination;
};

export type OrdersQuery = {
  q?: string;
  state?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: string;
};

type OdooOrderPaginationPayload = {
  page?: number;
  page_size?: number;
  total?: number;
  pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
};

type OdooOrderListPayload = {
  items?: OdooOrderPayload[];
  pagination?: OdooOrderPaginationPayload;
};

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ORDER_QUERY_KEYS = ["q", "state", "date_from", "date_to", "sort", "page"] as const;

export function mapOdooOrder(payload: OdooOrderPayload): StorefrontOrderDetail {
  const currency = payload.currency?.name || "USD";
  const money = (value: unknown) => ({ amount: formatOdooAmount(value), currency });
  const shipping = payload.shipping_address ? mapOdooAddress(payload.shipping_address) : null;
  const billing = payload.invoice_address ? mapOdooAddress(payload.invoice_address) : null;
  const asOrderAddress = (address: ReturnType<typeof mapOdooAddress> | null): OrderDetailDto["shipping"] => ({
    recipient: address?.recipient ?? "",
    phone: address?.phone ?? null,
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? null,
    city: address?.city ?? "",
    region: address?.region ?? null,
    postalCode: address?.postalCode ?? null,
    country: address?.country ?? "",
  });
  const items = (payload.items ?? []).map((item) => ({
    id: String(item.line_id),
    productName: item.name,
    variantName: null,
    sku: item.default_code || String(item.product_id),
    attributes: [] as Array<{ name: string; value: string }>,
    quantity: item.quantity,
    unitPrice: money(item.unit_price),
    lineTotal: money(item.subtotal),
  }));
  const createdAt = odooDate(payload.date_order);
  const status = payload.state || "sale";
  const paymentState = payload.payment?.state ?? null;

  return {
    id: String(payload.id),
    orderNumber: payload.name || String(payload.id),
    status,
    paymentStatus: paymentState ?? "not_paid",
    createdAt,
    updatedAt: createdAt,
    customerNotes: null,
    shipping: asOrderAddress(shipping),
    billing: billing ? asOrderAddress(billing) : null,
    items,
    totals: {
      subtotal: money(payload.amount_untaxed),
      discount: money(0),
      shipping: money(0),
      tax: money(payload.amount_tax),
      total: money(payload.amount_total),
    },
    payment: {
      method: null,
      status: paymentState ?? "not_paid",
      paidAmount: money(0),
      remainingAmount: money(payload.amount_total),
    },
    history: [
      {
        id: `${payload.id}-state`,
        status,
        createdAt,
        notes: payload.delivery?.reference ? `Delivery ${payload.delivery.reference}` : null,
      },
    ],
    paymentTerm: mapPaymentTerm(payload.payment_term),
    deliveryStatus: payload.delivery?.status ?? null,
    deliveryReference: payload.delivery?.reference ?? null,
    invoices: (payload.invoices ?? []).map((row) => ({
      id: String(row.id),
      name: row.name,
      state: row.state,
      paymentState: row.payment_state ?? null,
      amountTotal: formatOdooAmount(row.amount_total),
    })),
    invoiceCount: payload.payment?.invoice_count ?? (payload.invoices ?? []).length,
  };
}

export function mapOdooOrderSummary(payload: OdooOrderPayload): OrderSummaryDto {
  const detail = mapOdooOrder(payload);
  return {
    id: detail.id,
    orderNumber: detail.orderNumber,
    status: detail.status,
    createdAt: detail.createdAt,
    itemCount: detail.items.reduce((sum, item) => sum + item.quantity, 0),
    total: detail.totals.total,
    payment: {
      method: detail.payment.method,
      status: detail.payment.status,
    },
  };
}

export function parseOrderPage(value?: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseOrderState(value?: string): OdooOrderState | undefined {
  return value === "sale" || value === "done" || value === "sent" ? value : undefined;
}

export function parseOrderSort(value?: string): OdooOrderSort | undefined {
  return value === "newest" || value === "oldest" ? value : undefined;
}

export function parseOrderDate(value?: string): string | undefined {
  const text = value?.trim();
  return text && ISO_DATE.test(text) ? text : undefined;
}

export function buildOdooOrderQuery(params: OdooOrderListParams = {}): string {
  const search = new URLSearchParams();
  const page = Number.isInteger(params.page) && (params.page ?? 0) > 1 ? params.page : null;
  if (page) search.set("page", String(page));
  const pageSize = Number.isInteger(params.pageSize) && (params.pageSize ?? 0) > 0
    ? Math.min(params.pageSize as number, 100)
    : null;
  if (pageSize && pageSize !== 20) search.set("page_size", String(pageSize));
  const q = params.q?.trim();
  if (q) search.set("q", q);
  if (params.state === "sale" || params.state === "done" || params.state === "sent") {
    search.set("state", params.state);
  }
  const dateFrom = parseOrderDate(params.dateFrom);
  if (dateFrom) search.set("date_from", dateFrom);
  const dateTo = parseOrderDate(params.dateTo);
  if (dateTo) search.set("date_to", dateTo);
  if (params.sort === "newest" || params.sort === "oldest") search.set("sort", params.sort);
  return search.toString();
}

export function ordersListHref(query: OrdersQuery, overrides: Partial<OrdersQuery> = {}): string {
  const params = new URLSearchParams();
  const merged: OrdersQuery = { ...query, ...overrides };
  for (const key of ORDER_QUERY_KEYS) {
    const raw = merged[key]?.trim();
    if (!raw) continue;
    if (key === "page" && parseOrderPage(raw) <= 1) continue;
    if (key === "state" && !parseOrderState(raw)) continue;
    if (key === "sort" && !parseOrderSort(raw)) continue;
    if ((key === "date_from" || key === "date_to") && !parseOrderDate(raw)) continue;
    params.set(key, raw);
  }
  const search = params.toString();
  return search ? `/account/orders?${search}` : "/account/orders";
}

const listOdooOrdersByQuery = cache(async (
  queryString: string,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontOrderList> => {
  const path = queryString ? `/orders?${queryString}` : "/orders";
  const payload = await odooRequest<OdooOrderListPayload>(path, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  const items = (payload?.items ?? []).map(mapOdooOrderSummary);
  return {
    items,
    pagination: mapOdooOrderPagination(payload?.pagination, items.length),
  };
});

export async function listOdooOrders(
  params: OdooOrderListParams = {},
  cookies?: OdooCookieAdapter,
): Promise<StorefrontOrderList> {
  try {
    return await listOdooOrdersByQuery(buildOdooOrderQuery(params), cookies);
  } catch (error) {
    if (isUnauthenticated(error)) return emptyOrderList();
    throw error;
  }
}

export async function getOdooOrder(orderId: number, cookies?: OdooCookieAdapter): Promise<StorefrontOrderDetail> {
  const payload = await odooRequest<OdooOrderPayload>(`/orders/${orderId}`, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooOrder(payload);
}

function odooDate(value: string | null | undefined) {
  if (!value) return "";
  const normalized = String(value).trim().replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? String(value) : new Date(parsed).toISOString();
}

function isUnauthenticated(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return UNOAUTH_STATUSES.has(error.status) || error.code === "UNAUTHENTICATED";
}

function emptyOrderList(): StorefrontOrderList {
  return {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrevious: false,
    },
  };
}

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function mapOdooOrderPagination(
  payload: OdooOrderPaginationPayload | null | undefined,
  itemCount: number,
): StorefrontOrderPagination {
  const page = asPositiveInt(payload?.page) ?? 1;
  const pageSize = Math.min(asPositiveInt(payload?.page_size) ?? 20, 100);
  const total = typeof payload?.total === "number" && Number.isFinite(payload.total) && payload.total >= 0
    ? payload.total
    : itemCount;
  const pages = typeof payload?.pages === "number" && Number.isFinite(payload.pages) && payload.pages >= 0
    ? payload.pages
    : pageSize > 0
      ? Math.ceil(total / pageSize)
      : 0;
  return {
    page,
    pageSize,
    total,
    pages,
    hasNext: typeof payload?.has_next === "boolean" ? payload.has_next : page < pages,
    hasPrevious: typeof payload?.has_previous === "boolean" ? payload.has_previous : page > 1,
  };
}
