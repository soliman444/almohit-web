import { createBrandAction, deleteBrandAction, updateBrandAction } from "../../../lib/actions";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../components/admin/confirm-submit";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; status?: string }>;
}) {
  const admin = await requirePermission("brand.view");
  const params = await searchParams;
  const edit = queryValue(params.edit);
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const brands = await prisma.brand.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ name: insensitiveContains(q) }, { slug: insensitiveContains(q) }] } : {}),
      ...(status === "active" ? { status: true } : {}),
      ...(status === "disabled" ? { status: false } : {}),
    },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
  const editing = brands.find((brand) => brand.id === edit) ?? (edit ? await prisma.brand.findFirst({ where: { id: edit, deletedAt: null } }) : null);
  const canCreate = hasPermission(admin, "brand.create");
  const canUpdate = hasPermission(admin, "brand.update");
  const canDelete = hasPermission(admin, "brand.delete");

  return (
    <div className="stack">
      <AdminHeader title="Brands" count={brands.length} />
      <AdminFilters
        action="/admin/brands"
        q={q}
        qPlaceholder="Name or slug"
        filters={[{ name: "status", label: "Status", value: status, options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }] }]}
      />
      {canCreate && (
        <form className="card stack" action={createBrandAction}>
          <h2>Add brand</h2>
          <div className="grid">
            <label className="field">Name<input name="name" required /></label>
            <label className="field">Slug<input name="slug" placeholder="Optional" /></label>
          </div>
          <label className="field">Description<textarea name="description" /></label>
          <label className="admin-check"><input type="checkbox" name="status" defaultChecked /> Active</label>
          <button className="btn">Save brand</button>
        </form>
      )}

      {editing && canUpdate && (
        <form className="card stack" action={updateBrandAction}>
          <h2>Edit: {editing.name}</h2>
          <input type="hidden" name="id" value={editing.id} />
          <div className="grid">
            <label className="field">Name<input name="name" defaultValue={editing.name} required /></label>
            <label className="field">Slug<input name="slug" defaultValue={editing.slug} /></label>
          </div>
          <label className="field">Description<textarea name="description" defaultValue={editing.description ?? ""} /></label>
          <label className="admin-check"><input type="checkbox" name="status" defaultChecked={editing.status} /> Active</label>
          <button className="btn">Update brand</button>
        </form>
      )}

      <div className="card admin-table-wrap">
        {brands.length === 0 ? (
          <AdminEmpty title="No brands match these filters." />
        ) : (
          <table className="table">
            <thead><tr><th>Brand</th><th>Products</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td><b>{brand.name}</b><br /><span className="muted">{brand.slug}</span></td>
                  <td>{brand._count.products}</td>
                  <td><StatusBadge value={brand.status ? "ACTIVE" : "INACTIVE"} /></td>
                  <td>
                    <div className="actions">
                      {canUpdate && <a className="btn secondary" href={`/admin/brands?edit=${brand.id}`}>Edit</a>}
                      {canDelete && (
                        <form action={deleteBrandAction}>
                          <input type="hidden" name="id" value={brand.id} />
                          <ConfirmSubmit className="btn danger" message="Delete this brand?">Delete</ConfirmSubmit>
                        </form>
                      )}
                    </div>
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
