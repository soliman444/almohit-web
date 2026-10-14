import { approveBusinessRequestAction, rejectBusinessRequestAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { listOdooAdminTradeApplications } from "../../../lib/odoo/admin-trade";

const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

export default async function BusinessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePermission("customer.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status)?.toLowerCase() ?? "";

  let requests;
  try {
    requests = await listOdooAdminTradeApplications({ q, status });
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Trade account requests" />
        <p className="error">Odoo trade applications could not be loaded. Confirm the internal staff account can read them.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminHeader title="Trade account requests" count={requests.length} hint="Odoo applications" />
      <AdminFilters
        action="/admin/business-requests"
        q={q}
        qPlaceholder="Business, city, or customer"
        filters={[{
          name: "status",
          label: "Status",
          value: REQUEST_STATUSES.includes(status as typeof REQUEST_STATUSES[number]) ? status : "",
          options: REQUEST_STATUSES.map((item) => ({ value: item, label: item })),
        }]}
      />
      <div className="card admin-table-wrap">
        {requests.length === 0 ? (
          <AdminEmpty title="No trade requests match these filters." hint="Customers submit from the storefront. Approval writes to Odoo." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Customer</th>
                <th>Role</th>
                <th>Marketer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <b>{request.companyName}</b>
                    <br />
                    <span className="muted">{[request.businessType, request.city].filter(Boolean).join(" · ") || "—"}</span>
                  </td>
                  <td>
                    {request.customerName}
                    <br />
                    <span className="muted">{request.customerEmail ?? "—"}</span>
                  </td>
                  <td><span className="muted">{request.role}</span></td>
                  <td><span className="muted">{request.marketerName ?? "—"}</span></td>
                  <td>
                    <span className="muted">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString("en-GB") : "—"}
                    </span>
                  </td>
                  <td><StatusBadge value={request.status.toUpperCase()} /></td>
                  <td>
                    {request.status === "pending" ? (
                      <div className="actions">
                        <form action={approveBusinessRequestAction}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <button className="btn">Approve</button>
                        </form>
                        <form action={rejectBusinessRequestAction} className="actions">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input name="reason" placeholder="Rejection reason" />
                          <button className="btn danger">Reject</button>
                        </form>
                      </div>
                    ) : (request.rejectionReason ?? request.reviewedBy ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
