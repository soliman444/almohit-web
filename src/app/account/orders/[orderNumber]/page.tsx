import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StorefrontShell } from "../../../../components/storefront/shell";
import { requireUser } from "../../../../lib/auth";
import { isApprovedBuyer } from "../../../../lib/commerce";
import { formatCurrencyFromUSD, formatUsdBase } from "../../../../lib/currency";
import { getDisplayCurrencyState } from "../../../../lib/display-currency";
import { prisma } from "../../../../lib/db/prisma";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const { orderNumber } = await params;
  const { placed } = await searchParams;
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: user.customer.id },
    include: { items: true, history: { orderBy: { createdAt: "asc" } }, payments: true },
  });
  if (!order) notFound();

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account/orders">All orders</Link>
        {placed && <p className="sf-kicker">Order confirmed</p>}
        <h1>{order.orderNumber}</h1>
        <p>{order.createdAt.toLocaleString("en-GB")} · {order.status} · Payment {order.paymentStatus}</p>
        <p className="sf-cart-total">{formatCurrencyFromUSD(order.total, currency, catalog)}</p>
        <p className="muted">{formatUsdBase(order.total)} base</p>
        <ul className="sf-cart-lines">
          {order.items.map((item) => (
            <li key={item.id} className="sf-cart-line">
              <div>
                <b>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</b>
                <p>{item.quantity} × {formatCurrencyFromUSD(item.unitPrice, currency, catalog)} · SKU {item.sku}</p>
                {Array.isArray(item.attributesSnapshot) && item.attributesSnapshot.length > 0 && (
                  <p>{item.attributesSnapshot.map((entry) => `${(entry as { name?: string }).name}: ${(entry as { value?: string }).value}`).join(" · ")}</p>
                )}
              </div>
              <p>{formatCurrencyFromUSD(item.total, currency, catalog)}</p>
            </li>
          ))}
        </ul>
        <section>
          <h2>Delivery</h2>
          <p>{order.shippingName}</p>
          <p>{order.shippingLine1}{order.shippingLine2 ? `, ${order.shippingLine2}` : ""}</p>
          <p>{order.shippingCity}{order.shippingRegion ? `, ${order.shippingRegion}` : ""} {order.shippingPostal ?? ""}</p>
          <p>{order.shippingCountry}</p>
          {order.shippingPhone && <p>{order.shippingPhone}</p>}
          {order.customerNotes && <p>Notes: {order.customerNotes}</p>}
        </section>
        <section>
          <h2>Status</h2>
          <ol className="sf-timeline">
            {order.history.map((entry) => (
              <li key={entry.id}>
                <b>{entry.toStatus}</b>
                <p>{entry.createdAt.toLocaleString("en-GB")}{entry.notes ? ` · ${entry.notes}` : ""}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </StorefrontShell>
  );
}
