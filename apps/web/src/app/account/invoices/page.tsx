import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getInvoices } from "../../../lib/api/invoices";
import { safeApiCall } from "../../../lib/api/safe";
import { formatCompanyBase, formatDisplayMoney } from "../../../lib/currency";
import { getDisplayCurrencyState } from "../../../lib/display-currency";
import { requireStorefrontApproved } from "../../../lib/storefront-session";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await requireStorefrontApproved();
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const loaded = session.kind === "odoo"
    ? await safeApiCall(() => getInvoices())
    : { ok: true as const, data: [] };
  if (!loaded.ok) return <StorefrontUnavailable />;
  const invoices = loaded.data;

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Invoices</p>
        <h1>Invoice history.</h1>
        {session.kind !== "odoo" && <p>Invoice history is available on the current trade storefront.</p>}
        {session.kind === "odoo" && invoices.length === 0 && <p>No invoices yet.</p>}
        <ul className="sf-order-list">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link href={`/account/invoices/${invoice.id}`}>
                <b>{invoice.number}</b>
                <p>
                  {invoice.invoiceDate ?? "No date"}
                  {invoice.dueDate ? ` · Due ${invoice.dueDate}` : ""}
                  {invoice.order ? ` · Order ${invoice.order.name}` : ""}
                </p>
                <p>{invoice.paymentState ?? invoice.state} · {formatDisplayMoney(invoice.amountTotal.amount, currency, catalog)}</p>
                <p className="muted">Remaining {formatDisplayMoney(invoice.amountResidual.amount, currency, catalog)} · {formatCompanyBase(invoice.amountTotal.amount, catalog)} base</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </StorefrontShell>
  );
}
