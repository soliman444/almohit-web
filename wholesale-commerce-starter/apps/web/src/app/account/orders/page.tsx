import Link from "next/link";
import { CatalogPager } from "../../../components/storefront/catalog-pager";
import { OrdersFilters } from "../../../components/storefront/orders-filters";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getOrders } from "../../../lib/api/orders";
import { safeApiCall } from "../../../lib/api/safe";
import { formatCompanyBase, formatDisplayMoney } from "../../../lib/currency";
import { getDisplayCurrencyState } from "../../../lib/display-currency";
import {
  ordersListHref,
  parseOrderDate,
  parseOrderPage,
  parseOrderSort,
  parseOrderState,
  type OrdersQuery,
} from "../../../lib/odoo/orders";
import { requireStorefrontApproved } from "../../../lib/storefront-session";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersQuery>;
}) {
  const session = await requireStorefrontApproved();
  const query = await searchParams;
  const term = query.q?.trim();
  const state = parseOrderState(query.state);
  const dateFrom = parseOrderDate(query.date_from);
  const dateTo = parseOrderDate(query.date_to);
  const sort = parseOrderSort(query.sort);
  const page = parseOrderPage(query.page);
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const loaded = await safeApiCall(() => getOrders({
    q: term,
    state,
    dateFrom,
    dateTo,
    sort,
    page,
  }));
  if (!loaded.ok) return <StorefrontUnavailable />;
  const { items: orders, pagination } = loaded.data;
  const hrefFor = (order: (typeof orders)[number]) =>
    session.kind === "odoo" ? order.id : order.orderNumber;
  const filtered = Boolean(term || state || dateFrom || dateTo || sort);

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Orders</p>
        <h1>Order history.</h1>
        <p className="sf-count">{String(pagination.total).padStart(2, "0")} orders</p>
        <OrdersFilters query={query} />
        {orders.length === 0 && (
          <p>{filtered ? "No matching orders." : "No orders yet."}</p>
        )}
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
        <CatalogPager
          pagination={pagination}
          hrefForPage={(nextPage) => ordersListHref(query, { page: String(nextPage) })}
        />
      </main>
    </StorefrontShell>
  );
}
