import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteCategoryAction } from "../../../lib/actions";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { flattenCategories } from "../../../lib/catalog";
import { prisma } from "../../../lib/db/prisma";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../components/admin/confirm-submit";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; status?: string }>;
}) {
  const admin = await requirePermission("category.view");
  const params = await searchParams;
  const edit = queryValue(params.edit);
  if (edit) redirect(`/admin/categories/${edit}/edit`);
  const q = queryValue(params.q).toLowerCase();
  const status = queryValue(params.status);
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { parent: { select: { name: true } }, _count: { select: { products: { where: { deletedAt: null } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const tree = flattenCategories(categories).filter((category) => {
    const matchesQuery = !q || category.name.toLowerCase().includes(q) || category.slug.toLowerCase().includes(q);
    const matchesStatus = !status || (status === "active" ? category.status : !category.status);
    return matchesQuery && matchesStatus;
  });
  const canCreate = hasPermission(admin, "category.create");
  const canUpdate = hasPermission(admin, "category.update");
  const canDelete = hasPermission(admin, "category.delete");

  return (
    <div className="stack">
      <AdminHeader
        title="Categories"
        count={tree.length}
        actions={canCreate ? <Link className="btn" href="/admin/categories/new">New category</Link> : null}
      />
      <AdminFilters
        action="/admin/categories"
        q={queryValue(params.q)}
        qPlaceholder="Name or slug"
        filters={[{ name: "status", label: "Status", value: status, options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }] }]}
      />
      <div className="card admin-table-wrap">
        {tree.length === 0 ? (
          <AdminEmpty title="No categories match these filters." hint="Clear search or add a new category." />
        ) : (
          <table className="table">
            <thead><tr><th>Category</th><th>Parent</th><th>Order</th><th>Products</th><th>Hero</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tree.map((category) => (
                <tr key={category.id}>
                  <td style={{ paddingLeft: 13 + category.depth * 18 }}><b>{category.name}</b><br /><span className="muted">{category.slug}</span></td>
                  <td>{category.parent?.name ?? "—"}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category._count.products}</td>
                  <td><span className="muted">{category.heroVideoUrl ? "Video" : category.heroPosterUrl ? "Poster" : "Default"}</span></td>
                  <td><StatusBadge value={category.status ? "ACTIVE" : "INACTIVE"} /></td>
                  <td>
                    <div className="actions">
                      {canUpdate && <Link className="btn secondary" href={`/admin/categories/${category.id}/edit`}>Edit</Link>}
                      {canDelete && category._count.products === 0 && (
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <ConfirmSubmit className="btn danger" message="Delete this category?">Delete</ConfirmSubmit>
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
