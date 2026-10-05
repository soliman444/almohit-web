import Link from "next/link";
import { createCategoryAction } from "../../../../lib/actions";
import { requirePermission } from "../../../../lib/auth";
import { flattenCategories } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/db/prisma";
import { AdminHeader } from "../../../../components/admin/admin-ui";
import { CategoryForm } from "../category-form";

export default async function NewCategoryPage() {
  await requirePermission("category.create");
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });

  return (
    <div className="stack">
      <AdminHeader title="New category" actions={<Link className="btn secondary" href="/admin/categories">Back to categories</Link>} />
      <CategoryForm action={createCategoryAction} parents={flattenCategories(categories)} />
    </div>
  );
}
