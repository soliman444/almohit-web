import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePayPanel } from "../../../../components/storefront/invoice-pay-panel";
import { StorefrontShell } from "../../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../../components/system/storefront-unavailable";
import { ApiClientError } from "../../../../lib/api/client";
import { getInvoice, getInvoicePaymentProviders, invoiceAllowsOnlinePay } from "../../../../lib/api/invoices";
import { safeApiCall } from "../../../../lib/api/safe";
import { formatCompanyBase, formatDisplayMoney } from "../../../../lib/currency";
import { getDisplayCurrencyState } from "../../../../lib/display-currency";
import { requireStorefrontApproved } from "../../../../lib/storefront-session";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStorefrontApproved();
  if (session.kind !== "odoo") notFound();
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const { id } = await params;
  const loaded = await safeApiCall(() => loadInvoice(id));
  if (!loaded.ok) return <StorefrontUnavailable />;
  const { invoice, providers } = loaded.data;
  const money = (amount: string) => formatDisplayMoney(amount, currency, catalog);
  const showPay = invoiceAllowsOnlinePay(invoice, providers);

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account/invoices">All invoices</Link>
        <p className="sf-kicker">{invoice.paymentState ?? invoice.state}</p>
        <h1>{invoice.number}</h1>
        {invoice.order && (
          <p>
            Order <Link className="sf-text-link" href={`/account/orders/${invoice.order.id}`}>{invoice.order.name}</Link>
          </p>
        )}
        {invoice.paymentTerm && <p>Payment terms: {invoice.paymentTerm.name}</p>}
        {invoice.dueDate && <p>Due date: {invoice.dueDate}</p>}
        <p>Invoice date: {invoice.invoiceDate ?? "—"}</p>
        <p className="sf-cart-total">{money(invoice.amountTotal.amount)}</p>
        <p className="muted">{formatCompanyBase(invoice.amountTotal.amount, catalog)} base · Remaining {money(invoice.amountResidual.amount)}</p>
        <ul className="sf-cart-lines">
          {invoice.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="sf-cart-line">
              <div>
                <b>{item.name}</b>
                <p>
                  {item.quantity}{item.uom ? ` ${item.uom}` : ""} × {money(item.unitPrice.amount)}
                </p>
              </div>
              <p>{money(item.subtotal.amount)}</p>
            </li>
          ))}
        </ul>
        <section>
          <h2>Totals</h2>
          <p>Untaxed {money(invoice.amountUntaxed.amount)}</p>
          <p>Tax {money(invoice.amountTax.amount)}</p>
          <p>Total {money(invoice.amountTotal.amount)}</p>
          <p>Remaining {money(invoice.amountResidual.amount)}</p>
          {invoice.paidAmount && Number(invoice.paidAmount.amount) > 0 && (
            <p>Paid {money(invoice.paidAmount.amount)}</p>
          )}
        </section>
        <section>
          <h2>Payments</h2>
          {invoice.payments.length === 0 ? <p>No payments applied yet.</p> : (
            <ul className="sf-order-list">
              {invoice.payments.map((payment) => (
                <li key={payment.id}>
                  <p>{payment.date ?? "No date"} · {money(payment.appliedAmount.amount)} · {payment.state}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>Online payment</h2>
          {showPay ? (
            <InvoicePayPanel
              invoiceId={invoice.id}
              paymentState={invoice.paymentState}
              residual={invoice.amountResidual.amount}
              providers={providers}
            />
          ) : (
            <p>
              {invoice.paymentState === "paid"
                ? "This invoice is paid."
                : "Online payment is not required to keep this order valid. Pay by the due date according to your terms, or when a provider is available."}
            </p>
          )}
        </section>
      </main>
    </StorefrontShell>
  );
}

async function loadInvoice(id: string) {
  try {
    const [invoice, providers] = await Promise.all([
      getInvoice(id),
      getInvoicePaymentProviders(id),
    ]);
    return { invoice, providers };
  } catch (error) {
    if (error instanceof ApiClientError && (error.statusCode === 404 || error.code === "INVOICE_NOT_FOUND")) {
      notFound();
    }
    throw error;
  }
}
