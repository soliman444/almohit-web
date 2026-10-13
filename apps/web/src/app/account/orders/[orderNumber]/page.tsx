import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintInvoiceButton } from "../../../../components/storefront/print-invoice-button";
import { StorefrontShell } from "../../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../../components/system/storefront-unavailable";
import { getOrder } from "../../../../lib/api/orders";
import { ApiClientError } from "../../../../lib/api/client";
import { safeApiCall } from "../../../../lib/api/safe";
import { companyCurrencyCode, formatCompanyBase, formatDisplayMoney } from "../../../../lib/currency";
import { getDisplayCurrencyState } from "../../../../lib/display-currency";
import { requireStorefrontApproved } from "../../../../lib/storefront-session";
import type { StorefrontOrderDetail } from "../../../../lib/odoo/orders";

export const dynamic = "force-dynamic";

function pretty(value: string) {
  return value.replaceAll("_", " ");
}

function formatInvoiceDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: StorefrontOrderDetail["shipping"] | null | undefined;
}) {
  if (!address || (!address.recipient && !address.line1)) return null;
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(" ");
  return (
    <section>
      <h2>{title}</h2>
      {address.recipient ? <p>{address.recipient}</p> : null}
      {street ? <p>{street}</p> : null}
      {cityLine ? <p>{cityLine}</p> : null}
      {address.country ? <p>{address.country}</p> : null}
      {address.phone ? <p>{address.phone}</p> : null}
    </section>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  await requireStorefrontApproved();
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const { orderNumber } = await params;
  const { placed } = await searchParams;
  const loaded = await safeApiCall(() => loadOwnedOrder(orderNumber));
  if (!loaded.ok) return <StorefrontUnavailable />;
  const order = loaded.data;
  const odoo = order as StorefrontOrderDetail;
  const invoices = odoo.invoices ?? [];
  const invoiceCount = odoo.invoiceCount ?? 0;
  const money = (amount: string) => formatDisplayMoney(amount, currency, catalog);
  const billing = odoo.billing ?? order.shipping;

  return (
    <StorefrontShell>
      <main className="sf-account sf-invoice-page">
        <div className="sf-invoice-toolbar">
          <Link className="sf-text-link" href="/account/orders">All orders</Link>
          <PrintInvoiceButton orderNumber={order.orderNumber} />
        </div>
        {placed && <p className="sf-invoice-banner" role="status">Order confirmed</p>}
        <article className="sf-invoice" aria-label={`Invoice ${order.orderNumber}`}>
          <header className="sf-invoice-head">
            <div>
              <p className="sf-invoice-brand">Almohit</p>
              <p className="muted">Wholesale</p>
              <p className="muted">hello@almohit.local</p>
            </div>
            <div className="sf-invoice-number">
              <p className="sf-kicker">Invoice</p>
              <h1>{order.orderNumber}</h1>
              <p>{formatInvoiceDate(order.createdAt)}</p>
            </div>
          </header>

          <dl className="sf-invoice-facts">
            <div>
              <dt>Status</dt>
              <dd>{pretty(order.status)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                {pretty(order.paymentStatus)}
                {invoiceCount ? ` · ${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"}` : ""}
              </dd>
            </div>
            {odoo.paymentTerm && (
              <div>
                <dt>Payment terms</dt>
                <dd>{odoo.paymentTerm.name.trim()}</dd>
              </div>
            )}
            {odoo.deliveryStatus && (
              <div>
                <dt>Delivery</dt>
                <dd>
                  {pretty(odoo.deliveryStatus)}
                  {odoo.deliveryReference ? ` · ${odoo.deliveryReference}` : ""}
                </dd>
              </div>
            )}
          </dl>

          <div className="sf-invoice-parties">
            <AddressBlock title="Bill to" address={billing} />
            <AddressBlock title="Ship to" address={order.shipping} />
          </div>

          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">SKU</th>
                  <th scope="col" className="is-num">Qty</th>
                  <th scope="col" className="is-num">Unit price</th>
                  <th scope="col" className="is-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      {item.productName}
                      {item.variantName ? <p className="muted">{item.variantName}</p> : null}
                      {item.attributes.length > 0 ? (
                        <p className="muted">{item.attributes.map((entry) => `${entry.name}: ${entry.value}`).join(" · ")}</p>
                      ) : null}
                    </th>
                    <td className="is-sku">{item.sku || "—"}</td>
                    <td className="is-num">{item.quantity}</td>
                    <td className="is-num">{money(item.unitPrice.amount)}</td>
                    <td className="is-num">{money(item.lineTotal.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="sf-cart-summary" aria-label="Invoice totals">
            <table className="sf-cart-totals">
              <tbody>
                <tr>
                  <th scope="row">Subtotal</th>
                  <td>{money(order.totals.subtotal.amount)}</td>
                </tr>
                <tr>
                  <th scope="row">Tax</th>
                  <td>{money(order.totals.tax.amount)}</td>
                </tr>
                <tr>
                  <th scope="row">Total</th>
                  <td className="sf-cart-total">{money(order.totals.total.amount)}</td>
                </tr>
                {currency !== companyCurrencyCode(catalog) && (
                  <tr>
                    <th scope="row">Base currency</th>
                    <td className="muted">{formatCompanyBase(order.totals.total.amount, catalog)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {odoo.paymentTerm && (
            <p className="sf-invoice-note">
              Payment terms: {odoo.paymentTerm.name.trim()}. An unpaid invoice does not cancel this order.
            </p>
          )}
          {order.customerNotes && <p className="sf-invoice-note">Notes: {order.customerNotes}</p>}

          {invoices.length > 0 && (
            <section className="sf-invoice-linked">
              <h2>Invoices</h2>
              <ul className="sf-order-list">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={`/account/invoices/${invoice.id}`}>
                      <b>{invoice.name}</b>
                      <p>{pretty(invoice.paymentState ?? invoice.state)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
        {order.history.length > 0 && (
          <section className="sf-invoice-activity">
            <h2>Status</h2>
            <ol className="sf-timeline">
              {order.history.map((entry) => (
                <li key={entry.id}>
                  <b>{pretty(entry.status)}</b>
                  <p>{new Date(entry.createdAt).toLocaleString("en-GB")}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </StorefrontShell>
  );
}

async function loadOwnedOrder(orderNumber: string) {
  try {
    return await getOrder(orderNumber);
  } catch (error) {
    if (error instanceof ApiClientError && (error.statusCode === 404 || error.code === "ORDER_NOT_FOUND")) {
      notFound();
    }
    throw error;
  }
}
