import Link from "next/link";
import { requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { listOdooAdminOrders, staffCredentialsConfigured } from "../../../lib/odoo/admin-orders";

export const dynamic = "force-dynamic";

const ORDER_STATES = ["sale", "done", "cancel", "sent"] as const;
const PAYMENT_STATES = ["not_paid", "partial", "paid", "reversed"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string }>;
}) {
  await requirePermission("order.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const payment = queryValue(params.payment);

  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="Orders" />
        <p className="error">Odoo staff credentials are not configured. Orders are read from Odoo only.</p>
      </div>
    );
  }

  let orders;
  try {
    orders = await listOdooAdminOrders({
      q,
      state: ORDER_STATES.includes(status as (typeof ORDER_STATES)[number]) ? status : undefined,
      payment: PAYMENT_STATES.includes(payment as (typeof PAYMENT_STATES)[number]) ? payment : undefined,
    });
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Orders" />
        <p className="error">Odoo orders could not be loaded. Confirm the internal staff account can read sale orders.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminHeader title="Orders" count={orders.length} hint="Odoo storefront sale orders" />
      <AdminFilters
        action="/admin/orders"
        q={q}
        qPlaceholder="Order number, customer, or email"
        filters={[
          { name: "status", label: "Status", value: ORDER_STATES.includes(status as (typeof ORDER_STATES)[number]) ? status : "", options: ORDER_STATES.map((item) => ({ value: item, label: item })) },
          { name: "payment", label: "Payment", value: PAYMENT_STATES.includes(payment as (typeof PAYMENT_STATES)[number]) ? payment : "", options: PAYMENT_STATES.map((item) => ({ value: item, label: item })) },
        ]}
      />
      <div className="card admin-table-wrap">
        {orders.length === 0 ? (
          <AdminEmpty title="No orders match these filters." hint="Confirmed storefront checkouts appear here from Odoo." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <b>{order.orderNumber}</b>
                    <br />
                    <span className="muted">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB") : "—"}</span>
                  </td>
                  <td>
                    {order.customerName || "—"}
                    <br />
                    <span className="muted">{order.customerEmail || "—"}</span>
                  </td>
                  <td>{order.itemCount}</td>
                  <td><StatusBadge value={order.status} /></td>
                  <td><StatusBadge value={order.paymentStatus} /></td>
                  <td>{order.total.amount} {order.total.currency}</td>
                  <td><Link className="btn secondary" href={`/admin/orders/${order.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
