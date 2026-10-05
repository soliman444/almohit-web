import { createStaffUserAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import type { UserStatus } from "../../../../generated/prisma/client";

const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  await requirePermission("user.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const type = queryValue(params.type);
  const status = queryValue(params.status);
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(q ? { OR: [{ name: insensitiveContains(q) }, { email: insensitiveContains(q) }] } : {}),
        ...(USER_STATUSES.includes(status as UserStatus) ? { status: status as UserStatus } : {}),
        ...(type === "customer" ? { customer: { isNot: null } } : {}),
        ...(type === "staff" ? { customer: null } : {}),
      },
      include: { roles: { include: { role: true } }, customer: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="stack">
      <AdminHeader title="Users & staff" count={users.length} />
      <AdminFilters
        action="/admin/users"
        q={q}
        qPlaceholder="Name or email"
        filters={[
          { name: "type", label: "Type", value: type, options: [{ value: "staff", label: "Staff" }, { value: "customer", label: "Customer" }] },
          { name: "status", label: "Status", value: status, options: USER_STATUSES.map((item) => ({ value: item, label: item })) },
        ]}
      />
      <form className="card stack" action={createStaffUserAction}>
        <h2>Create staff account</h2>
        <div className="grid">
          <label className="field">Name<input name="name" required /></label>
          <label className="field">Email<input name="email" type="email" required /></label>
          <label className="field">Temporary password<input name="password" type="password" minLength={8} required /></label>
        </div>
        <label className="field">
          Role
          <select name="roleId" required>
            <option value="">Select role</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>
        <button className="btn">Create staff</button>
      </form>
      <div className="card admin-table-wrap">
        {users.length === 0 ? (
          <AdminEmpty title="No users match these filters." />
        ) : (
          <table className="table">
            <thead><tr><th>User</th><th>Type</th><th>Roles</th><th>Trade</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><b>{user.name}</b><br /><span className="muted">{user.email}</span></td>
                  <td>{user.customer ? "Customer" : "Staff"}</td>
                  <td>{user.roles.map(({ role }) => role.name).join(", ") || "—"}</td>
                  <td>{user.customer ? <StatusBadge value={user.customer.businessStatus} /> : <span className="muted">—</span>}</td>
                  <td><StatusBadge value={user.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
