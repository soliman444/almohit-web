import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getCustomerPayments } from "../../../lib/commerce/payments";
import { safeApiCall } from "../../../lib/odoo/safe";
import { formatCompanyBase, formatDisplayMoney } from "../../../lib/currency/format";
import { getDisplayCurrencyState } from "../../../lib/currency/display";
import { requireMerchant } from "../../../lib/session/access";

export const dynamic = "force-dynamic";

function journalLabel(type: string | null, name: string | null) {
  if (type === "bank") return name ? `Bank · ${name}` : "Bank";
  if (type === "cash") return name ? `Cash · ${name}` : "Cash";
  return name ?? "Payment";
}

export default async function PaymentsPage() {
  const session = await requireMerchant();
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const loaded = session.kind === "odoo"
    ? await safeApiCall(() => getCustomerPayments())
    : { ok: true as const, data: [] };
  if (!loaded.ok) return <StorefrontUnavailable />;
  const payments = loaded.data;

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Payments</p>
        <h1>Payment history.</h1>
        {session.kind !== "odoo" && <p>Payment history is available on the current trade storefront.</p>}
        {session.kind === "odoo" && payments.length === 0 && <p>No payments yet.</p>}
        <ul className="sf-order-list">
          {payments.map((payment) => (
            <li key={payment.id}>
              <b>{payment.reference}</b>
              <p>{payment.date ?? "No date"} · {journalLabel(payment.journalType, payment.journalName)}</p>
              <p>{formatDisplayMoney(payment.paymentAmount.amount, currency, catalog)}</p>
              <p className="muted">{formatCompanyBase(payment.paymentAmount.amount, catalog)} base</p>
              {payment.invoices.length === 0 ? (
                <p>Not applied to an invoice yet.</p>
              ) : (
                payment.invoices.map((invoice) => (
                  <p key={invoice.id}>
                    Applied {formatDisplayMoney(invoice.appliedAmount.amount, currency, catalog)} to{" "}
                    <Link className="sf-text-link" href={`/account/invoices/${invoice.id}`}>{invoice.name}</Link>
                  </p>
                ))
              )}
              {Number(payment.unappliedAmount.amount) > 0 && (
                <p>Unapplied {formatDisplayMoney(payment.unappliedAmount.amount, currency, catalog)}</p>
              )}
            </li>
          ))}
        </ul>
      </main>
    </StorefrontShell>
  );
}
