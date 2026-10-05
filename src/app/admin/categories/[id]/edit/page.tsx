import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCategoryAction, updateCategoryAction } from "../../../../../lib/actions";
import { hasPermission, requirePermission } from "../../../../../lib/auth";
import { flattenCategories } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/db/prisma";
import { AdminHeader } from "../../../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../../../components/admin/confirm-submit";
import { CategoryForm } from "../../category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("category.update");
  const { id } = await params;
  const [category, categories] = await Promise.all([
    prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
  ]);
  if (!category) notFound();

  const parents = flattenCategories(categories).filter((item) => item.id !== category.id);

  return (
    <div className="stack">
      <AdminHeader
        title={category.name}
        hint={category.slug}
        actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>}
      />
      <CategoryForm action={updateCategoryAction} parents={parents} category={category} />
      {hasPermission(admin, "category.delete") && category._count.products === 0 && (
        <form action={deleteCategoryAction}>
          <input type="hidden" name="id" value={category.id} />
          <ConfirmSubmit className="btn danger" message="Delete this category?">Delete category</ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
