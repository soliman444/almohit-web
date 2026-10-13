import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getOrders } from "../../../lib/api/orders";
import { safeApiCall } from "../../../lib/api/safe";
import { formatCompanyBase, formatDisplayMoney } from "../../../lib/currency";
import { getDisplayCurrencyState } from "../../../lib/display-currency";
import { requireStorefrontApproved } from "../../../lib/storefront-session";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await requireStorefrontApproved();
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const loaded = await safeApiCall(() => getOrders());
  if (!loaded.ok) return <StorefrontUnavailable />;
  const orders = loaded.data;
  const hrefFor = (order: (typeof orders)[number]) =>
    session.kind === "odoo" ? order.id : order.orderNumber;

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Orders</p>
        <h1>Order history.</h1>
        {orders.length === 0 && <p>No orders yet.</p>}
        <ul className="sf-order-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/account/orders/${hrefFor(order)}`}>
                <b>{order.orderNumber}</b>
                <p>{new Date(order.createdAt).toLocaleDateString("en-GB")} · {order.status} · {formatDisplayMoney(order.total.amount, currency, catalog)}</p>
                <p className="muted">{formatCompanyBase(order.total.amount, catalog)} base</p>
                <p>{order.itemCount} items</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </StorefrontShell>
  );
}
