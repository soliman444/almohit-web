import Link from "next/link";
import { requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import type { OrderStatus, PaymentStatus } from "../../../../generated/prisma/client";

const ORDER_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "READY", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];

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
  const orders = await prisma.order.findMany({
    where: {
      ...(q ? {
        OR: [
          { orderNumber: insensitiveContains(q) },
          { customer: { user: { OR: [{ name: insensitiveContains(q) }, { email: insensitiveContains(q) }] } } },
        ],
      } : {}),
      ...(ORDER_STATUSES.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
      ...(PAYMENT_STATUSES.includes(payment as PaymentStatus) ? { paymentStatus: payment as PaymentStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { include: { user: true } }, items: true },
  });

  return (
    <div className="stack">
      <AdminHeader title="Orders" count={orders.length} />
      <AdminFilters
        action="/admin/orders"
        q={q}
        qPlaceholder="Order number, customer, or email"
        filters={[
          { name: "status", label: "Status", value: status, options: ORDER_STATUSES.map((item) => ({ value: item, label: item })) },
          { name: "payment", label: "Payment", value: payment, options: PAYMENT_STATUSES.map((item) => ({ value: item, label: item })) },
        ]}
      />
      <div className="card admin-table-wrap">
        {orders.length === 0 ? (
          <AdminEmpty title="No orders match these filters." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total (USD)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <b>{order.orderNumber}</b>
                    <br />
                    <span className="muted">{order.createdAt.toLocaleString("en-GB")}</span>
                  </td>
                  <td>
                    {order.customer.user.name}
                    <br />
                    <span className="muted">{order.customer.user.email}</span>
                  </td>
                  <td>{order.items.length}</td>
                  <td><StatusBadge value={order.status} /></td>
                  <td><StatusBadge value={order.paymentStatus} /></td>
                  <td>{order.total.toFixed(2)}</td>
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
