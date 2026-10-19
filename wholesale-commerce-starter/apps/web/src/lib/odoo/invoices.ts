import type { MoneyAmount } from "@almohit/contracts";
import { ApiClientError, ApiUnavailableError } from "../api/client";
import { CommerceError } from "../commerce-errors";
import { formatOdooAmount } from "./cart";
import { odooRequest } from "./client";
import { mapPaymentTerm, type OdooCookieAdapter, type OdooPaginatedList, type OdooPaymentTermPayload, type PaymentTerm } from "./types";

export type OdooNamedRef = {
  id: number;
  name: string;
};

export type OdooInvoiceOrderPayload = {
  id: number;
  name: string;
};

export type OdooInvoiceItemPayload = {
  product_id?: number | null;
  name: string;
  quantity: number;
  uom?: OdooNamedRef | null;
  unit_price: number;
  subtotal: number;
};

export type OdooInvoicePaymentPayload = {
  id: number;
  date?: string | null;
  applied_amount: number;
  state: string;
};

export type OdooInvoicePayload = {
  id: number;
  name: string;
  state: string;
  payment_state?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  currency?: OdooNamedRef | null;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_residual: number;
  paid_amount?: number | null;
  payment_term?: OdooPaymentTermPayload | null;
  order?: OdooInvoiceOrderPayload | null;
  payments?: OdooInvoicePaymentPayload[];
  items?: OdooInvoiceItemPayload[];
};

export type StorefrontInvoiceItem = {
  name: string;
  quantity: number;
  uom: string | null;
  unitPrice: MoneyAmount;
  subtotal: MoneyAmount;
};

export type StorefrontInvoicePayment = {
  id: string;
  date: string | null;
  appliedAmount: MoneyAmount;
  state: string;
};

export type StorefrontInvoice = {
  id: string;
  number: string;
  state: string;
  paymentState: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  amountUntaxed: MoneyAmount;
  amountTax: MoneyAmount;
  amountTotal: MoneyAmount;
  amountResidual: MoneyAmount;
  paidAmount: MoneyAmount | null;
  paymentTerm: PaymentTerm | null;
  order: { id: string; name: string } | null;
  payments: StorefrontInvoicePayment[];
  items: StorefrontInvoiceItem[];
};

function money(value: unknown, currency: string): MoneyAmount {
  return { amount: formatOdooAmount(typeof value === "number" ? value : Number(value)), currency };
}

export function mapOdooInvoice(payload: OdooInvoicePayload): StorefrontInvoice {
  const currency = payload.currency?.name || "USD";
  return {
    id: String(payload.id),
    number: payload.name,
    state: payload.state,
    paymentState: payload.payment_state ?? null,
    invoiceDate: payload.invoice_date ?? null,
    dueDate: payload.due_date ?? null,
    currency,
    amountUntaxed: money(payload.amount_untaxed, currency),
    amountTax: money(payload.amount_tax, currency),
    amountTotal: money(payload.amount_total, currency),
    amountResidual: money(payload.amount_residual, currency),
    paidAmount: payload.paid_amount == null ? null : money(payload.paid_amount, currency),
    paymentTerm: mapPaymentTerm(payload.payment_term),
    order: payload.order ? { id: String(payload.order.id), name: payload.order.name } : null,
    payments: (payload.payments ?? []).map((row) => ({
      id: String(row.id),
      date: row.date ?? null,
      appliedAmount: money(row.applied_amount, currency),
      state: row.state,
    })),
    items: (payload.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      uom: item.uom?.name ?? null,
      unitPrice: money(item.unit_price, currency),
      subtotal: money(item.subtotal, currency),
    })),
  };
}

export function invoiceHasResidual(invoice: StorefrontInvoice) {
  const residual = Number(invoice.amountResidual.amount);
  return Number.isFinite(residual) && residual > 0;
}

export function isInvoicePayable(invoice: StorefrontInvoice, providerCount: number) {
  if (invoice.state !== "posted") return false;
  if (invoice.paymentState === "paid" || invoice.paymentState === "reversed") return false;
  if (!invoiceHasResidual(invoice)) return false;
  return providerCount > 0;
}

export function mapOdooInvoiceError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiUnavailableError) return new CommerceError("SERVICE_UNAVAILABLE");
  if (error instanceof ApiClientError) {
    if (error.code === "INVOICE_NOT_FOUND") return new CommerceError("INVOICE");
    if (error.code === "INVOICE_ALREADY_PAID") return new CommerceError("PAID");
    if (error.code === "INVOICE_NOT_PAYABLE" || error.code === "PROVIDER_NOT_AVAILABLE") {
      return new CommerceError("PAYMENT");
    }
    if (error.code === "UNAUTHENTICATED" || error.code === "WHOLESALE_APPROVAL_REQUIRED") {
      return new CommerceError("UNAPPROVED");
    }
    return new CommerceError("INVOICE");
  }
  return new CommerceError("INVOICE");
}

export async function listOdooInvoices(cookies?: OdooCookieAdapter): Promise<StorefrontInvoice[]> {
  const payload = await odooRequest<OdooPaginatedList<OdooInvoicePayload>>("/invoices", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return (payload?.items ?? []).map(mapOdooInvoice);
}

export async function getOdooInvoice(invoiceId: number, cookies?: OdooCookieAdapter): Promise<StorefrontInvoice> {
  const payload = await odooRequest<OdooInvoicePayload>(`/invoices/${invoiceId}`, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooInvoice(payload);
}
