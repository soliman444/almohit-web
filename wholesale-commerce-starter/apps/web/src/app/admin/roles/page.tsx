import Link from "next/link";
import { requirePermission } from "../../../lib/auth";
import { AdminHeader } from "../../../components/admin/admin-ui";
import { odooBackendGroupsUrl, odooBackendUsersUrl } from "../../../lib/odoo/admin-customers";

export default async function RolesPage() {
  await requirePermission("role.view");

  return (
    <div className="stack">
      <AdminHeader
        title="Roles & permissions"
        hint="Access is controlled by native Odoo groups. This website does not keep a separate staff permission table."
      />
      <div className="card stack">
        <p>Create staff, assign groups, and change passwords in Odoo.</p>
        <p className="muted">Internal users can open this admin. Portal customers use the storefront only. Odoo access rights still apply when saving products, orders, or partners.</p>
        <p>
          <Link className="btn" href={odooBackendUsersUrl()} target="_blank" rel="noreferrer">Users in Odoo</Link>
          {" "}
          <Link className="btn secondary" href={odooBackendGroupsUrl()} target="_blank" rel="noreferrer">Groups in Odoo</Link>
        </p>
      </div>
    </div>
  );
}
