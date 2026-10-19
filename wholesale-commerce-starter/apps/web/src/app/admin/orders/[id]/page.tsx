import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../lib/auth";
import { AdminHeader, StatusBadge } from "../../../../components/admin/admin-ui";
import { getOdooAdminOrder, odooBackendOrderUrl } from "../../../../lib/odoo/admin-orders";
import { parseOdooRecordId } from "../../../../lib/odoo/catalog";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("order.view");
  const { id } = await params;
  const orderId = parseOdooRecordId(id);
  if (!orderId) notFound();

  let order;
  try {
    order = await getOdooAdminOrder(orderId);
  } catch {
    notFound();
  }

  return (
    <div className="stack">
      <AdminHeader
        title={order.orderNumber}
        hint={order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB") : "Odoo sale order"}
        actions={<Link className="btn secondary" href="/admin/orders">All orders</Link>}
      />
      <div className="grid">
        <div className="card stack">
          <div>
            <span className="muted">Customer</span>
            <p><b>{order.customerName || "—"}</b></p>
            <p className="muted">{order.customerEmail || "—"}</p>
          </div>
          <div className="actions">
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
          </div>
        </div>
        <div className="card">
          <span className="muted">Total ({order.totals.total.currency})</span>
          <h2>{order.totals.total.amount}</h2>
          <p className="muted">Tax {order.totals.tax.amount} · Untaxed {order.totals.subtotal.amount}</p>
        </div>
        <div className="card">
          <span className="muted">Delivery</span>
          <p>{order.shipping.recipient || "—"}</p>
          <p className="muted">
            {[order.shipping.line1, order.shipping.city, order.shipping.country].filter(Boolean).join(", ") || "—"}
          </p>
          {order.deliveryReference ? <p>Delivery {order.deliveryReference}</p> : null}
          {order.paymentTerm ? <p className="muted">Payment term: {order.paymentTerm.name}</p> : null}
        </div>
      </div>
      <div className="card admin-table-wrap">
        <table className="table">
          <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>{item.unitPrice.amount}</td>
                <td>{item.lineTotal.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card stack">
        <h2>Invoices</h2>
        {order.invoices.length === 0 ? <p className="muted">No invoices yet. Create them in Odoo.</p> : (
          <table className="table">
            <thead><tr><th>Invoice</th><th>State</th><th>Payment</th><th>Amount</th></tr></thead>
            <tbody>
              {order.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.name}</td>
                  <td><StatusBadge value={invoice.state} /></td>
                  <td><StatusBadge value={invoice.paymentState || "—"} /></td>
                  <td>{invoice.amountTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card stack">
        <p>Status, invoices, and payments stay native in Odoo so the storefront and the app read the same sale.order.</p>
        <div className="actions">
          <Link className="btn" href={odooBackendOrderUrl(orderId)} target="_blank" rel="noreferrer">Manage in Odoo</Link>
        </div>
      </div>
    </div>
  );
}
