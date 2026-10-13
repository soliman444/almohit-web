import Link from "next/link";
import { parseOdooRecordId } from "../../../../../lib/odoo/catalog";
import { requirePermission } from "../../../../../lib/auth";
import { AdminHeader } from "../../../../../components/admin/admin-ui";
import { odooBackendCategoryUrl } from "../../../../../lib/odoo/admin-taxonomy";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("category.update");
  const { id } = await params;
  const categoryId = parseOdooRecordId(id);

  return (
    <div className="stack">
      <AdminHeader title="Edit category" actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>} />
      <p>Category edits write to Odoo. The website list is read-only after create.</p>
      {categoryId ? (
        <Link className="btn" href={odooBackendCategoryUrl(categoryId)} target="_blank" rel="noreferrer">
          Open in Odoo
        </Link>
      ) : (
        <p className="error">This URL is not an Odoo category id.</p>
      )}
    </div>
  );
}
