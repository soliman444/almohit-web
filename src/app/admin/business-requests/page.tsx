import { approveBusinessRequestAction, rejectBusinessRequestAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import type { BusinessRequestStatus } from "../../../../generated/prisma/client";

const REQUEST_STATUSES: BusinessRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export default async function BusinessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePermission("customer.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const requests = await prisma.businessRequest.findMany({
    where: {
      ...(q ? {
        OR: [
          { businessName: insensitiveContains(q) },
          { city: insensitiveContains(q) },
          { customer: { user: { OR: [{ name: insensitiveContains(q) }, { email: insensitiveContains(q) }] } } },
        ],
      } : {}),
      ...(REQUEST_STATUSES.includes(status as BusinessRequestStatus) ? { status: status as BusinessRequestStatus } : {}),
    },
    include: { customer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="stack">
      <AdminHeader title="Trade account requests" count={requests.length} />
      <AdminFilters
        action="/admin/business-requests"
        q={q}
        qPlaceholder="Business, city, or customer"
        filters={[{ name: "status", label: "Status", value: status, options: REQUEST_STATUSES.map((item) => ({ value: item, label: item })) }]}
      />
      <div className="card admin-table-wrap">
        {requests.length === 0 ? (
          <AdminEmpty title="No trade requests match these filters." />
        ) : (
          <table className="table">
            <thead><tr><th>Business</th><th>Customer</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <b>{request.businessName}</b>
                    <br />
                    <span className="muted">{[request.businessType, request.city].filter(Boolean).join(" · ") || "—"}</span>
                  </td>
                  <td>
                    {request.customer.user.name}
                    <br />
                    <span className="muted">{request.customer.user.email}</span>
                  </td>
                  <td><span className="muted">{request.createdAt.toLocaleDateString("en-GB")}</span></td>
                  <td><StatusBadge value={request.status} /></td>
                  <td>
                    {request.status === "PENDING" ? (
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
                    ) : (request.rejectionReason ?? "—")}
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
