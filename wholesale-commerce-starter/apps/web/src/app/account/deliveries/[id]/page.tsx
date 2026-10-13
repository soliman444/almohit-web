import Link from "next/link";
import { notFound } from "next/navigation";
import { OnceForm, OnceSubmit } from "../../../../components/storefront/once-submit";
import { StorefrontShell } from "../../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../../components/system/storefront-unavailable";
import { ApiClientError } from "../../../../lib/api/client";
import { safeApiCall } from "../../../../lib/api/safe";
import { updateDeliveryStatusAction } from "../../../../lib/delivery-actions";
import { getOdooDelivery, type StorefrontDelivery } from "../../../../lib/odoo/deliveries";
import { requireDistributor } from "../../../../lib/storefront-session";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function addressRows(delivery: StorefrontDelivery) {
  const address = delivery.shipping;
  const street = [address?.line1, address?.line2].filter(Boolean).join(", ");
  const cityLine = [address?.city, address?.region, address?.postalCode].filter(Boolean).join(" ");
  return [
    ["Recipient", address?.recipient || delivery.customerName || "—"],
    ["Street", street || "—"],
    ["City", cityLine || "—"],
    ["Country", address?.country || "—"],
    ["Phone", address?.phone || delivery.customerPhone || "—"],
  ] as const;
}

export default async function DeliveryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  await requireDistributor();
  const { id } = await params;
  const { updated, error } = await searchParams;
  const loaded = await safeApiCall(() => loadOwnedDelivery(id));
  if (!loaded.ok) return <StorefrontUnavailable />;
  const delivery = loaded.data;
  const canReady = delivery.allowedActions.includes("ready");
  const canDeliver = delivery.allowedActions.includes("delivered");

  return (
    <StorefrontShell>
      <main className="sf-account sf-delivery-page">
        <Link className="sf-text-link" href="/account/deliveries">All deliveries</Link>
        <p className="sf-kicker">Delivery</p>
        <h1>{delivery.name}</h1>
        {updated && <p className="sf-invoice-banner" role="status">Delivery updated</p>}
        {error === "status" && <p className="error">That status change is not allowed.</p>}
        {error === "unavailable" && <p className="error">The store service is temporarily unavailable.</p>}

        <section className="sf-delivery-section">
          <h2>Details</h2>
          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table sf-delivery-meta">
              <tbody>
                <tr>
                  <th scope="row">Delivery</th>
                  <td>{delivery.name}</td>
                </tr>
                <tr>
                  <th scope="row">Order</th>
                  <td>{delivery.order?.name ?? delivery.origin ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Status</th>
                  <td><span className="sf-delivery-status">{pretty(delivery.status)}</span></td>
                </tr>
                <tr>
                  <th scope="row">Scheduled</th>
                  <td>{formatWhen(delivery.scheduledDate)}</td>
                </tr>
                <tr>
                  <th scope="row">Completed</th>
                  <td>{delivery.dateDone ? formatWhen(delivery.dateDone) : "Not yet"}</td>
                </tr>
                <tr>
                  <th scope="row">Customer</th>
                  <td>{delivery.customerName ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="sf-delivery-section">
          <h2>Deliver to</h2>
          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table sf-delivery-meta">
              <tbody>
                {addressRows(delivery).map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sf-delivery-section">
          <h2>Products</h2>
          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col" className="is-num">Qty</th>
                </tr>
              </thead>
              <tbody>
                {delivery.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.productName}</th>
                    <td className="is-sku">{item.sku || "—"}</td>
                    <td className="is-num">{item.quantity}{item.uom ? ` ${item.uom}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sf-delivery-section">
          <h2>Update status</h2>
          {canReady || canDeliver ? (
            <div className="sf-delivery-actions">
              {canReady && (
                <OnceForm action={updateDeliveryStatusAction}>
                  <input type="hidden" name="deliveryId" value={delivery.id} />
                  <input type="hidden" name="status" value="ready" />
                  <OnceSubmit className="sf-btn is-subtle" pendingLabel="Updating…">
                    <span>Mark ready</span>
                  </OnceSubmit>
                </OnceForm>
              )}
              {canDeliver && (
                <OnceForm action={updateDeliveryStatusAction}>
                  <input type="hidden" name="deliveryId" value={delivery.id} />
                  <input type="hidden" name="status" value="delivered" />
                  <OnceSubmit className="sf-btn" pendingLabel="Updating…">
                    <span>Mark delivered</span>
                  </OnceSubmit>
                </OnceForm>
              )}
            </div>
          ) : (
            <p className="muted">
              {delivery.status === "delivered"
                ? "This delivery is already completed. Status can no longer be changed."
                : "No status change is available for this delivery."}
            </p>
          )}
        </section>
      </main>
    </StorefrontShell>
  );
}

async function loadOwnedDelivery(deliveryId: string) {
  const id = Number(deliveryId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  try {
    return await getOdooDelivery(id);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.code === "DELIVERY_NOT_FOUND")) {
      notFound();
    }
    throw error;
  }
}
