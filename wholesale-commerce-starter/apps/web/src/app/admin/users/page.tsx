import Link from "next/link";
import { requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import {
  listOdooAdminCustomers,
  listOdooAdminStaff,
  odooBackendPartnerUrl,
  odooBackendUsersUrl,
  odooBackendUserUrl,
} from "../../../lib/odoo/admin-customers";

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

  let staff: Awaited<ReturnType<typeof listOdooAdminStaff>> = [];
  let staffError = "";
  if (showStaff) {
    try {
      staff = await listOdooAdminStaff({ q });
    } catch {
      staffError = "Odoo staff users could not be loaded.";
    }
  }

  let customers: Awaited<ReturnType<typeof listOdooAdminCustomers>> = [];
  let customerError = "";
  if (showCustomers) {
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

  const count = (showStaff && !staffError ? staff.length : 0) + (showCustomers && !customerError ? customers.length : 0);

  return (
    <div className="stack">
      <AdminHeader
        title="Users"
        count={count}
        hint="Staff and customers are Odoo users. Create or change access in Odoo."
      />
      <AdminFilters
        action="/admin/users"
        q={q}
        qPlaceholder="Name or email"
        filters={[
          { name: "type", label: "Type", value: type, options: [{ value: "staff", label: "Staff" }, { value: "customer", label: "Customer" }] },
          ...(showCustomers && !showStaff
            ? [{
              name: "status",
              label: "Trade status",
              value: TRADE_STATUSES.includes(status as (typeof TRADE_STATUSES)[number]) ? status : "",
              options: TRADE_STATUSES.map((item) => ({ value: item, label: item })),
            }, {
              name: "role",
              label: "Role",
              value: APP_ROLES.includes(role as (typeof APP_ROLES)[number]) ? role : "",
              options: APP_ROLES.map((item) => ({ value: item, label: item })),
            }]
            : []),
        ]}
      />

      {showStaff && (
        <p>
          <Link className="btn" href={odooBackendUsersUrl()} target="_blank" rel="noreferrer">
            Manage staff in Odoo
          </Link>
        </p>
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
          <h2>Odoo staff</h2>
          {staffError ? (
            <p className="error">{staffError}</p>
          ) : staff.length === 0 ? (
            <AdminEmpty title="No internal Odoo users match these filters." />
          ) : (
            <table className="table">
              <thead><tr><th>User</th><th>Groups</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id}>
                    <td><b>{user.name}</b><br /><span className="muted">{user.email}</span></td>
                    <td>{user.groups.join(", ") || "Internal User"}</td>
                    <td><StatusBadge value={user.active ? "ACTIVE" : "INACTIVE"} /></td>
                    <td>
                      <Link className="btn secondary" href={odooBackendUserUrl(Number(user.id))} target="_blank" rel="noreferrer">
                        Open in Odoo
                      </Link>
                    </td>
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
