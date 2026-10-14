import Link from "next/link";
import { createOdooCategoryFormAction } from "../../../../lib/actions";
import { requirePermission } from "../../../../lib/auth";
import { AdminHeader } from "../../../../components/admin/admin-ui";
import { categoryParentOptions, listOdooAdminCategories } from "../../../../lib/odoo/admin-taxonomy";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("category.create");
  const { error } = await searchParams;

  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="New category" actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>} />
        <p className="error">Odoo staff credentials are not configured.</p>
      </div>
    );
  }

  let parents;
  try {
    parents = categoryParentOptions(await listOdooAdminCategories());
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="New category" actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>} />
        <p className="error">Odoo categories could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminHeader title="New category" hint="Creates a native Odoo product.category" actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>} />
      {error ? <p className="error">{error}</p> : null}
      <form className="card stack form-wide" action={createOdooCategoryFormAction}>
        <label className="field">Name<input name="name" required /></label>
        <label className="field">
          Parent category
          <select name="parentId">
            <option value="">No parent</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>
            ))}
          </select>
        </label>
        <button className="btn">Save category</button>
      </form>
    </div>
  );
}
