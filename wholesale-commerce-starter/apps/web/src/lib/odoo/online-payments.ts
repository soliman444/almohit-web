import { ApiClientError, ApiUnavailableError } from "../api/client";
import { CommerceError } from "../commerce-errors";
import { formatOdooAmount } from "./cart";
import { odooRequest } from "./client";
import type { OdooCookieAdapter } from "./types";

export type OdooPaymentProviderPayload = {
  id: number;
  code: string;
  name: string;
  state?: string;
};

export type OdooPaymentFlowPayload = {
  operation?: string;
  processing?: Record<string, unknown>;
};

export type OdooTransactionPayload = {
  id: number;
  reference?: string;
  state: string;
  amount?: number;
  currency?: { id: number; name: string } | null;
  provider?: { id: number; code: string; name: string } | null;
  invoices?: Array<{ id: number; name: string }>;
  transaction_id?: number;
  payment_flow?: OdooPaymentFlowPayload;
};

export type StorefrontPaymentProvider = {
  id: string;
  code: string;
  name: string;
};

export type StorefrontPaymentFlow = {
  operation: string | null;
  redirectFormHtml: string | null;
  processing: Record<string, string | number | boolean>;
};

export type StorefrontPaymentTransaction = {
  id: string;
  reference: string;
  state: string;
  amount: string;
  currency: string;
  providerName: string | null;
  providerCode: string | null;
  invoiceIds: string[];
  paymentFlow: StorefrontPaymentFlow | null;
};

export function odooInvoicePaymentPayload(providerId: number) {
  return { provider_id: providerId };
}

const HIDDEN_FLOW_KEYS = new Set([
  "api_key",
  "secret",
  "password",
  "private_key",
  "webhook_secret",
  "webhook_key",
  "signing_secret",
  "access_token",
  "publishable_key",
  "s2s_token",
]);

function isHiddenFlowKey(key: string) {
  const lowered = key.toLowerCase();
  if (HIDDEN_FLOW_KEYS.has(lowered)) return true;
  return ["secret", "password", "api_key", "private_key", "token", "webhook"].some((part) =>
    lowered.includes(part),
  );
}

function safeProcessing(raw: Record<string, unknown> | undefined) {
  const processing: Record<string, string | number | boolean> = {};
  let redirectFormHtml: string | null = null;
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (isHiddenFlowKey(key)) continue;
    if (key === "redirect_form_html" && typeof value === "string") {
      redirectFormHtml = value;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      processing[key] = value;
    }
  }
  return { processing, redirectFormHtml };
}

export function mapOdooProvider(payload: OdooPaymentProviderPayload): StorefrontPaymentProvider {
  return {
    id: String(payload.id),
    code: payload.code,
    name: payload.name,
  };
}

export function mapOdooTransaction(payload: OdooTransactionPayload): StorefrontPaymentTransaction {
  const flow = payload.payment_flow
    ? {
        operation: payload.payment_flow.operation ?? null,
        ...safeProcessing(payload.payment_flow.processing),
      }
    : null;
  return {
    id: String(payload.id),
    reference: payload.reference || String(payload.id),
    state: payload.state,
    amount: formatOdooAmount(typeof payload.amount === "number" ? payload.amount : Number(payload.amount)),
    currency: payload.currency?.name || "USD",
    providerName: payload.provider?.name ?? null,
    providerCode: payload.provider?.code ?? null,
    invoiceIds: (payload.invoices ?? []).map((row) => String(row.id)),
    paymentFlow: flow,
  };
}

export function isPaidTransaction(state: string) {
  return state === "done";
}

export function isFailedTransaction(state: string) {
  return state === "cancel" || state === "error";
}

export function mapOdooOnlinePaymentError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiUnavailableError) return new CommerceError("SERVICE_UNAVAILABLE");
  if (error instanceof ApiClientError) {
    if (error.code === "INVOICE_ALREADY_PAID") return new CommerceError("PAID");
    if (error.code === "INVOICE_NOT_FOUND") return new CommerceError("INVOICE");
    if (
      error.code === "INVOICE_NOT_PAYABLE"
      || error.code === "PROVIDER_NOT_AVAILABLE"
      || error.code === "TRANSACTION_NOT_FOUND"
    ) {
      return new CommerceError("PAYMENT");
    }
    if (error.code === "UNAUTHENTICATED") return new CommerceError("UNAPPROVED");
    return new CommerceError("PAYMENT");
  }
  return new CommerceError("PAYMENT");
}

export async function listOdooPaymentProviders(
  invoiceId?: number,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontPaymentProvider[]> {
  const path = invoiceId
    ? `/payment/providers?invoice_id=${invoiceId}`
    : "/payment/providers";
  const payload = await odooRequest<OdooPaymentProviderPayload[]>(path, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return (payload ?? []).map(mapOdooProvider);
}

export async function startOdooInvoicePayment(
  invoiceId: number,
  providerId: number,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontPaymentTransaction> {
  const payload = await odooRequest<OdooTransactionPayload>(`/invoices/${invoiceId}/payment`, {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: odooInvoicePaymentPayload(providerId),
  });
  return mapOdooTransaction(payload);
}

export async function getOdooPaymentTransaction(
  transactionId: number,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontPaymentTransaction> {
  const payload = await odooRequest<OdooTransactionPayload>(`/payment/transactions/${transactionId}`, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooTransaction(payload);
}
