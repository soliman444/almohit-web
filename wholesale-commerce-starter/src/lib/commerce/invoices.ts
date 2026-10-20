import { ApiClientError } from "../odoo/errors";
import { isInvoicePayable, type StorefrontInvoice } from "../odoo/invoices";
import type { StorefrontPaymentProvider } from "../odoo/online-payments";

async function usingOdoo() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}

export async function getInvoices() {
  if (!(await usingOdoo())) return [];
  const { listOdooInvoices } = await import("../odoo/invoices");
  return listOdooInvoices();
}

export async function getInvoice(invoiceId: string) {
  if (!(await usingOdoo())) {
    throw new ApiClientError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }
  const { parseOdooRecordId } = await import("../odoo/catalog");
  const { getOdooInvoice } = await import("../odoo/invoices");
  const id = parseOdooRecordId(invoiceId);
  if (!id) throw new ApiClientError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  return getOdooInvoice(id);
}

export async function getInvoicePaymentProviders(invoiceId: string) {
  if (!(await usingOdoo())) return [];
  const { parseOdooRecordId } = await import("../odoo/catalog");
  const { listOdooPaymentProviders } = await import("../odoo/online-payments");
  const id = parseOdooRecordId(invoiceId);
  if (!id) return [];
  return listOdooPaymentProviders(id);
}

export function invoiceAllowsOnlinePay(
  invoice: StorefrontInvoice,
  providers: StorefrontPaymentProvider[],
) {
  return isInvoicePayable(invoice, providers.length);
}
