import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../lib/auth";
import { allowedOrderTransitions } from "../../../../lib/commerce";
import { recordPaymentAction, updateAdminOrderNoteAction, updateOrderStatusAction } from "../../../../lib/commerce-actions";
import { commerceMessage } from "../../../../lib/commerce-errors";
import { paidTotalFromPayments, remainingPayable } from "../../../../lib/commerce-rules";
import { moneyText } from "../../../../lib/money";
import { prisma } from "../../../../lib/db/prisma";
import { AdminHeader, StatusBadge } from "../../../../components/admin/admin-ui";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("order.view");
  const { id } = await params;
  const { error } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { include: { user: true } },
      items: true,
      history: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  const nextStatuses = allowedOrderTransitions(order.status);
  const paid = paidTotalFromPayments(order.payments);
  const remaining = remainingPayable(paid, order.total);

  return (
    <div className="stack">
      <AdminHeader
        title={order.orderNumber}
        hint={order.createdAt.toLocaleString("en-GB")}
        actions={<Link className="btn secondary" href="/admin/orders">All orders</Link>}
      />
      {error && <p className="error">{commerceMessage(error)}</p>}
      <div className="grid">
        <div className="card stack">
          <div>
            <span className="muted">Customer</span>
            <p><b>{order.customer.user.name}</b></p>
            <p className="muted">{order.customer.user.email}</p>
          </div>
          <div className="actions">
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
          </div>
        </div>
        <div className="card">
          <span className="muted">Total (USD)</span>
          <h2>{order.total.toFixed(2)}</h2>
          <p className="muted">Paid {moneyText(paid)} · Remaining {moneyText(remaining)}</p>
        </div>
        <div className="card">
          <span className="muted">Delivery</span>
          <p>{order.shippingName}</p>
          <p className="muted">{order.shippingLine1}, {order.shippingCity}, {order.shippingCountry}</p>
          {order.customerNotes && <p>Customer notes: {order.customerNotes}</p>}
        </div>
      </div>
      <div className="card admin-table-wrap">
        <table className="table">
          <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit (USD)</th><th>Total (USD)</th></tr></thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>{item.unitPrice.toFixed(2)}</td>
                <td>{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nextStatuses.length > 0 && (
        <form className="card stack" action={updateOrderStatusAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <h2>Change status</h2>
          <div className="grid">
            <label className="field">
              Next status
              <select name="status" defaultValue={nextStatuses[0]}>
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="field">Note<input name="notes" /></label>
          </div>
          <button className="btn" type="submit">Update status</button>
        </form>
      )}
      <form className="card stack" action={updateAdminOrderNoteAction}>
        <input type="hidden" name="orderId" value={order.id} />
        <label className="field">Admin notes<textarea name="adminNotes" defaultValue={order.adminNotes ?? ""} /></label>
        <button className="btn" type="submit">Save note</button>
      </form>
      <div className="card stack">
        <h2>Payments (USD)</h2>
        {order.payments.length === 0 ? <p className="muted">No payments recorded.</p> : (
          <table className="table">
            <thead><tr><th>Method</th><th>Status</th><th>Amount</th><th>Reference</th></tr></thead>
            <tbody>
              {order.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.method}</td>
                  <td><StatusBadge value={payment.status} /></td>
                  <td>{payment.amount.toFixed(2)}</td>
                  <td>{payment.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {order.status !== "CANCELLED" && remaining.gt(0) && (
          <form className="stack" action={recordPaymentAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <div className="grid">
              <label className="field">Amount (USD)<input name="amount" required defaultValue={moneyText(remaining)} /></label>
              <label className="field">
                Method
                <select name="method" defaultValue="BANK_TRANSFER">
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </label>
              <label className="field">Reference<input name="reference" /></label>
            </div>
            <label className="admin-check"><input type="checkbox" name="markPaid" defaultChecked /> Mark paid</label>
            <button className="btn" type="submit">Record payment</button>
          </form>
        )}
      </div>
      <div className="card stack">
        <h2>Timeline</h2>
        <ol className="stack">
          {order.history.map((entry) => (
            <li key={entry.id}>
              <StatusBadge value={entry.toStatus} />
              <span className="muted"> {entry.createdAt.toLocaleString("en-GB")}</span>
              {entry.actor ? ` · ${entry.actor.name}` : ""}
              {entry.notes ? ` · ${entry.notes}` : ""}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
