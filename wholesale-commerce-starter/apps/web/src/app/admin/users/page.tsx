import Link from "next/link";
import { createStaffUserAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import {
  listOdooAdminCustomers,
  odooBackendPartnerUrl,
  staffCredentialsConfigured,
} from "../../../lib/odoo/admin-customers";
import type { UserStatus } from "@almohit/database";

const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const TRADE_STATUSES = ["normal", "pending", "approved", "rejected"] as const;
const APP_ROLES = ["merchant", "buyer", "distributor", "marketer"] as const;

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; role?: string }>;
}) {
  await requirePermission("user.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const type = queryValue(params.type);
  const status = queryValue(params.status);
  const role = queryValue(params.role);
  const showStaff = type !== "customer";
  const showCustomers = type !== "staff";

  const [staff, roles] = await Promise.all([
    showStaff
      ? prisma.user.findMany({
          where: {
            deletedAt: null,
            customer: null,
            ...(q ? { OR: [{ name: insensitiveContains(q) }, { email: insensitiveContains(q) }] } : {}),
            ...(USER_STATUSES.includes(status as UserStatus) ? { status: status as UserStatus } : {}),
          },
          include: { roles: { include: { role: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  let customers: Awaited<ReturnType<typeof listOdooAdminCustomers>> = [];
  let customerError = "";
  if (showCustomers) {
    if (!staffCredentialsConfigured()) {
      customerError = "Odoo staff credentials are not configured. Trade customers are read from Odoo only.";
    } else {
      try {
        customers = await listOdooAdminCustomers({
          q,
          status: TRADE_STATUSES.includes(status as (typeof TRADE_STATUSES)[number]) ? status : undefined,
          role: APP_ROLES.includes(role as (typeof APP_ROLES)[number]) ? role : undefined,
        });
      } catch {
        customerError = "Odoo customers could not be loaded.";
      }
    }
  }

  const count = (showStaff ? staff.length : 0) + (showCustomers && !customerError ? customers.length : 0);

  return (
    <div className="stack">
      <AdminHeader
        title="Users"
        count={count}
        hint="Website staff stay here. Trade customers are Odoo portal partners."
      />
      <AdminFilters
        action="/admin/users"
        q={q}
        qPlaceholder="Name or email"
        filters={[
          { name: "type", label: "Type", value: type, options: [{ value: "staff", label: "Staff" }, { value: "customer", label: "Customer" }] },
          ...(showStaff
            ? [{ name: "status", label: "Staff status", value: USER_STATUSES.includes(status as UserStatus) ? status : "", options: USER_STATUSES.map((item) => ({ value: item, label: item })) }]
            : [{
              name: "status",
              label: "Trade status",
              value: TRADE_STATUSES.includes(status as (typeof TRADE_STATUSES)[number]) ? status : "",
              options: TRADE_STATUSES.map((item) => ({ value: item, label: item })),
            }]),
          ...(showCustomers && !showStaff
            ? [{
              name: "role",
              label: "Role",
              value: APP_ROLES.includes(role as (typeof APP_ROLES)[number]) ? role : "",
              options: APP_ROLES.map((item) => ({ value: item, label: item })),
            }]
            : []),
        ]}
      />

      {showStaff && (
        <form className="card stack" action={createStaffUserAction}>
          <h2>Create staff account</h2>
          <p className="muted">Staff sign into this admin. They are not Odoo portal customers.</p>
          <div className="grid">
            <label className="field">Name<input name="name" required /></label>
            <label className="field">Email<input name="email" type="email" required /></label>
            <label className="field">Temporary password<input name="password" type="password" minLength={8} required /></label>
          </div>
          <label className="field">
            Role
            <select name="roleId" required>
              <option value="">Select role</option>
              {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button className="btn">Create staff</button>
        </form>
      )}

      {showCustomers && (
        <div className="card admin-table-wrap">
          <h2>Trade customers</h2>
          {customerError ? (
            <p className="error">{customerError}</p>
          ) : customers.length === 0 ? (
            <AdminEmpty title="No Odoo customers match these filters." hint="Customers register on the storefront." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Role</th>
                  <th>Trade</th>
                  <th>Price group</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <b>{customer.name}</b>
                      <br />
                      <span className="muted">{customer.email || "—"}{customer.city ? ` · ${customer.city}` : ""}</span>
                    </td>
                    <td>{customer.role}</td>
                    <td><StatusBadge value={customer.tradeStatus} /></td>
                    <td>{customer.priceGroupName || "—"}</td>
                    <td>
                      <Link className="btn secondary" href={odooBackendPartnerUrl(Number(customer.id))} target="_blank" rel="noreferrer">
                        Manage in Odoo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showStaff && (
        <div className="card admin-table-wrap">
          <h2>Website staff</h2>
          {staff.length === 0 ? (
            <AdminEmpty title="No staff match these filters." />
          ) : (
            <table className="table">
              <thead><tr><th>User</th><th>Roles</th><th>Status</th></tr></thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id}>
                    <td><b>{user.name}</b><br /><span className="muted">{user.email}</span></td>
                    <td>{user.roles.map(({ role: item }) => item.name).join(", ") || "—"}</td>
                    <td><StatusBadge value={user.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
