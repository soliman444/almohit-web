import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { requireUser } from "../../../lib/auth";
import { isApprovedBuyer } from "../../../lib/commerce";
import { formatCurrencyFromUSD, formatUsdBase } from "../../../lib/currency";
import { getDisplayCurrencyState } from "../../../lib/display-currency";
import { prisma } from "../../../lib/db/prisma";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const orders = await prisma.order.findMany({
    where: { customerId: user.customer.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

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
              <Link href={`/account/orders/${order.orderNumber}`}>
                <b>{order.orderNumber}</b>
                <p>{order.createdAt.toLocaleDateString("en-GB")} · {order.status} · {formatCurrencyFromUSD(order.total, currency, catalog)}</p>
                <p className="muted">{formatUsdBase(order.total)} base</p>
                <p>{order.items.length} items</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </StorefrontShell>
  );
}
