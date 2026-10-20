import { ApiClientError } from "../odoo/errors";

async function usingOdoo() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}

export async function getCustomerPayments() {
  if (!(await usingOdoo())) return [];
  const { listOdooPayments } = await import("../odoo/payments");
  return listOdooPayments();
}

export async function getCustomerPayment(paymentId: string) {
  if (!(await usingOdoo())) {
    throw new ApiClientError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const { parseOdooRecordId } = await import("../odoo/catalog");
  const { getOdooPayment } = await import("../odoo/payments");
  const id = parseOdooRecordId(paymentId);
  if (!id) throw new ApiClientError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  return getOdooPayment(id);
}
