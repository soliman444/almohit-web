"use server";

import { requireMerchant } from "../session/access";
import { parseOdooRecordId } from "../odoo/catalog";
import { ApiClientError } from "../odoo/errors";
import { CommerceError, type CommerceErrorCode } from "../commerce/errors";
import { mapUnavailable, revalidateStore } from "./shared";

export type StorefrontPayResult =
  | { ok: true; alreadyPaid: true }
  | {
      ok: true;
      alreadyPaid: false;
      transactionId: string;
      transactionState: string;
      redirectFormHtml: string | null;
      redirectUrl: string | null;
    }
  | { ok: false; error: CommerceErrorCode };

export async function startStorefrontInvoicePayment(
  invoiceId: string,
  providerId: string,
): Promise<StorefrontPayResult> {
  const odoo = await import("../odoo/auth");
  if (!(await odoo.hasOdooSession())) return { ok: false, error: "UNAPPROVED" };
  await requireMerchant();
  const invoiceRecordId = parseOdooRecordId(invoiceId);
  const providerRecordId = parseOdooRecordId(providerId);
  if (!invoiceRecordId || !providerRecordId) return { ok: false, error: "PAYMENT" };
  try {
    const { startOdooInvoicePayment } = await import("../odoo/online-payments");
    const transaction = await startOdooInvoicePayment(invoiceRecordId, providerRecordId);
    revalidateStore();
    const processing = transaction.paymentFlow?.processing ?? {};
    const redirectUrl = typeof processing.redirect_url === "string" ? processing.redirect_url : null;
    return {
      ok: true,
      alreadyPaid: false,
      transactionId: transaction.id,
      transactionState: transaction.state,
      redirectFormHtml: transaction.paymentFlow?.redirectFormHtml ?? null,
      redirectUrl,
    };
  } catch (error) {
    const mapped = mapOdooInvoicePaymentError(error);
    if (mapped.code === "PAID") {
      revalidateStore();
      return { ok: true, alreadyPaid: true };
    }
    return { ok: false, error: mapped.code };
  }
}

export async function refreshStorefrontInvoice(invoiceId: string) {
  const odoo = await import("../odoo/auth");
  if (!(await odoo.hasOdooSession())) return null;
  const { parseOdooRecordId: parseId } = await import("../odoo/catalog");
  const { getOdooInvoice } = await import("../odoo/invoices");
  const id = parseId(invoiceId);
  if (!id) return null;
  try {
    const invoice = await getOdooInvoice(id);
    if (invoice.paymentState === "paid" || Number(invoice.amountResidual.amount) <= 0) {
      revalidateStore();
    }
    return {
      paymentState: invoice.paymentState,
      residual: invoice.amountResidual.amount,
      state: invoice.state,
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "INVOICE_NOT_FOUND") return null;
    throw error;
  }
}

export async function refreshStorefrontTransaction(transactionId: string) {
  const odoo = await import("../odoo/auth");
  if (!(await odoo.hasOdooSession())) return null;
  const id = parseOdooRecordId(transactionId);
  if (!id) return null;
  try {
    const { getOdooPaymentTransaction } = await import("../odoo/online-payments");
    const transaction = await getOdooPaymentTransaction(id);
    return { id: transaction.id, state: transaction.state };
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "TRANSACTION_NOT_FOUND") return null;
    throw error;
  }
}

function mapOdooInvoicePaymentError(error: unknown): CommerceError {
  const unavailable = mapUnavailable(error);
  if (unavailable) return unavailable;
  if (error instanceof ApiClientError) {
    const mapped: Record<string, CommerceErrorCode> = {
      INVOICE_NOT_FOUND: "INVOICE",
      INVOICE_NOT_PAYABLE: "PAYMENT",
      INVOICE_ALREADY_PAID: "PAID",
      PROVIDER_NOT_AVAILABLE: "PAYMENT",
      TRANSACTION_NOT_FOUND: "PAYMENT",
      UNAUTHENTICATED: "UNAPPROVED",
    };
    return new CommerceError(mapped[error.code] ?? "PAYMENT");
  }
  return error instanceof CommerceError ? error : new CommerceError("PAYMENT");
}
