import Link from "next/link";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader } from "../../../components/admin/admin-ui";
import { listOdooAdminCategories, odooBackendCategoryUrl } from "../../../lib/odoo/admin-taxonomy";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requirePermission("category.view");
  const params = await searchParams;
  const q = queryValue(params.q).toLowerCase();
  const canCreate = hasPermission(admin, "category.create");

  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="Categories" actions={canCreate ? <Link className="btn" href="/admin/categories/new">New category</Link> : null} />
        <p className="error">Odoo staff credentials are not configured. Categories are read from Odoo only.</p>
      </div>
    );
  }

  let categories;
  try {
    categories = await listOdooAdminCategories();
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Categories" />
        <p className="error">Odoo categories could not be loaded.</p>
      </div>
    );
  }

  const tree = categories.filter((category) => {
    if (!q) return true;
    return category.name.toLowerCase().includes(q) || (category.complete_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="stack">
      <AdminHeader
        title="Categories"
        count={tree.length}
        hint="Odoo product categories"
        actions={canCreate ? <Link className="btn" href="/admin/categories/new">New category</Link> : null}
      />
      <AdminFilters action="/admin/categories" q={queryValue(params.q)} qPlaceholder="Category name" />
      <div className="card admin-table-wrap">
        {tree.length === 0 ? (
          <AdminEmpty title="No categories match these filters." hint="Clear search or add a new category." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Parent</th>
                <th>Products</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tree.map((category) => (
                <tr key={category.id}>
                  <td>
                    <b>{category.name}</b>
                    <br />
                    <span className="muted">{category.complete_name}</span>
                  </td>
                  <td>{category.parent_name ?? "—"}</td>
                  <td>{category.product_count ?? 0}</td>
                  <td>
                    <Link className="btn secondary" href={odooBackendCategoryUrl(category.id)} target="_blank" rel="noreferrer">
                      Manage in Odoo
                    </Link>
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
