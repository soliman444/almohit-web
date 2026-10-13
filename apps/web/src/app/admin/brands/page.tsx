import { createOdooBrandFormAction } from "../../../lib/actions";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { listOdooAdminBrands, odooBackendBrandUrl, staffCredentialsConfigured } from "../../../lib/odoo/admin-taxonomy";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; error?: string }>;
}) {
  const admin = await requirePermission("brand.view");
  const params = await searchParams;
  const q = queryValue(params.q).toLowerCase();
  const status = queryValue(params.status);
  const error = queryValue(params.error);
  const canCreate = hasPermission(admin, "brand.create");

  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="Brands" />
        <p className="error">Odoo staff credentials are not configured. Brands are read from Odoo only.</p>
      </div>
    );
  }

  let brands;
  try {
    brands = await listOdooAdminBrands();
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Brands" />
        <p className="error">Odoo brands could not be loaded.</p>
      </div>
    );
  }

  const rows = brands.filter((brand) => {
    const matchesQuery = !q || brand.name.toLowerCase().includes(q);
    const matchesStatus = !status
      || (status === "active" && brand.active !== false)
      || (status === "disabled" && brand.active === false);
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="stack">
      <AdminHeader title="Brands" count={rows.length} hint="Odoo brands" />
      {error ? <p className="error">{error}</p> : null}
      <AdminFilters
        action="/admin/brands"
        q={queryValue(params.q)}
        qPlaceholder="Brand name"
        filters={[{ name: "status", label: "Status", value: status, options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }] }]}
      />
      {canCreate && (
        <form className="card stack" action={createOdooBrandFormAction}>
          <h2>Add brand</h2>
          <label className="field">Name<input name="name" required /></label>
          <label className="field">Logo<input name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" /></label>
          <button className="btn">Save brand</button>
        </form>
      )}
      <div className="card admin-table-wrap">
        {rows.length === 0 ? (
          <AdminEmpty title="No brands match these filters." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Products</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((brand) => (
                <tr key={brand.id}>
                  <td><b>{brand.name}</b></td>
                  <td>{brand.product_count ?? 0}</td>
                  <td><StatusBadge value={brand.active === false ? "INACTIVE" : "ACTIVE"} /></td>
                  <td>
                    <a className="btn secondary" href={odooBackendBrandUrl(brand.id)} target="_blank" rel="noreferrer">
                      Manage in Odoo
                    </a>
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
