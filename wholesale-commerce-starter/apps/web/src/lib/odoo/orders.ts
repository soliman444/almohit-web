import type { OrderDetailDto, OrderSummaryDto } from "@almohit/contracts";
import { ApiClientError } from "../api/client";
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

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

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

export async function listOdooOrders(cookies?: OdooCookieAdapter): Promise<OrderSummaryDto[]> {
  try {
    const payload = await odooRequest<OdooOrderPayload[]>("/orders", {
      method: "GET",
      cookies,
      captureSetCookie: false,
    });
    return (payload ?? []).map(mapOdooOrderSummary);
  } catch (error) {
    if (isUnauthenticated(error)) return [];
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
