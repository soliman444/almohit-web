import type { MoneyAmount } from "@almohit/contracts";
import { ApiClientError, ApiUnavailableError } from "../api/client";
import { CommerceError } from "../commerce-errors";
import { formatOdooAmount } from "./cart";
import { odooRequest } from "./client";
import type { OdooCookieAdapter } from "./types";

export type OdooPaymentCurrency = {
  id: number;
  name: string;
};

export type OdooPaymentJournal = {
  id: number;
  name: string;
  type?: string | null;
};

export type OdooPaymentInvoicePayload = {
  id: number;
  name: string;
  applied_amount: number;
};

export type OdooPaymentPayload = {
  id: number;
  reference: string;
  date?: string | null;
  state: string;
  payment_type?: string;
  payment_amount: number;
  unapplied_amount: number;
  currency?: OdooPaymentCurrency | null;
  journal?: OdooPaymentJournal | null;
  invoices?: OdooPaymentInvoicePayload[];
};

export type StorefrontPaymentInvoice = {
  id: string;
  name: string;
  appliedAmount: MoneyAmount;
};

export type StorefrontPayment = {
  id: string;
  reference: string;
  date: string | null;
  state: string;
  paymentAmount: MoneyAmount;
  unappliedAmount: MoneyAmount;
  journalName: string | null;
  journalType: string | null;
  invoices: StorefrontPaymentInvoice[];
};

function money(value: unknown, currency: string): MoneyAmount {
  return { amount: formatOdooAmount(typeof value === "number" ? value : Number(value)), currency };
}

export function mapOdooPayment(payload: OdooPaymentPayload): StorefrontPayment {
  const currency = payload.currency?.name || "USD";
  return {
    id: String(payload.id),
    reference: payload.reference,
    date: payload.date ?? null,
    state: payload.state,
    paymentAmount: money(payload.payment_amount, currency),
    unappliedAmount: money(payload.unapplied_amount, currency),
    journalName: payload.journal?.name ?? null,
    journalType: payload.journal?.type ?? null,
    invoices: (payload.invoices ?? []).map((row) => ({
      id: String(row.id),
      name: row.name,
      appliedAmount: money(row.applied_amount, currency),
    })),
  };
}

export function mapOdooPaymentError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiUnavailableError) return new CommerceError("SERVICE_UNAVAILABLE");
  if (error instanceof ApiClientError) {
    if (error.code === "PAYMENT_NOT_FOUND") return new CommerceError("PAYMENT");
    if (error.code === "UNAUTHENTICATED") return new CommerceError("UNAPPROVED");
    return new CommerceError("PAYMENT");
  }
  return new CommerceError("PAYMENT");
}

export async function listOdooPayments(cookies?: OdooCookieAdapter): Promise<StorefrontPayment[]> {
  const payload = await odooRequest<OdooPaymentPayload[]>("/payments", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return (payload ?? []).map(mapOdooPayment);
}

export async function getOdooPayment(paymentId: number, cookies?: OdooCookieAdapter): Promise<StorefrontPayment> {
  const payload = await odooRequest<OdooPaymentPayload>(`/payments/${paymentId}`, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooPayment(payload);
}
