import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { safeApiCall } from "../../../lib/odoo/safe";
import { listOdooDeliveries } from "../../../lib/odoo/deliveries";
import { requireDistributor } from "../../../lib/session/access";

export const dynamic = "force-dynamic";

function pretty(value: string) {
  return value.replaceAll("_", " ");
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(String(value).replace(" ", "T"));
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireDistributor();
  const { error } = await searchParams;
  const loaded = await safeApiCall(() => listOdooDeliveries());
  if (!loaded.ok) return <StorefrontUnavailable />;
  const deliveries = loaded.data;

  return (
    <StorefrontShell>
      <main className="sf-account sf-delivery-page">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Deliveries</p>
        <h1>Assigned deliveries.</h1>
        {error === "notfound" && <p className="error">That delivery was not found.</p>}
        {error === "payment" && <p className="error">This order needs a full or partial payment before it can be distributed.</p>}
        {deliveries.length === 0 && (
          <p>No paid deliveries assigned yet. Orders appear here after a full or partial payment and after you are set as Responsible.</p>
        )}
        {deliveries.length > 0 && (
          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table">
              <thead>
                <tr>
                  <th scope="col">Delivery</th>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col" className="is-num">Items</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => {
                  const itemCount = delivery.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={delivery.id}>
                      <th scope="row">
                        <Link href={`/account/deliveries/${delivery.id}`}>{delivery.name}</Link>
                      </th>
                      <td>{delivery.order?.name ?? delivery.origin ?? "—"}</td>
                      <td>{delivery.customerName ?? "—"}</td>
                      <td><span className="sf-delivery-status">{pretty(delivery.status)}</span></td>
                      <td>{formatWhen(delivery.scheduledDate)}</td>
                      <td className="is-num">{itemCount || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </StorefrontShell>
  );
}
