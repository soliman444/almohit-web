import Link from "next/link";
import { createProductAction } from "../../../../lib/actions";
import { hasPermission, requirePermission } from "../../../../lib/auth";
import { flattenCategories } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/db/prisma";
import { AdminHeader } from "../../../../components/admin/admin-ui";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const admin = await requirePermission("product.create");
  const { error } = await searchParams;
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.brand.findMany({ where: { deletedAt: null, status: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="stack">
      <AdminHeader title="New product" actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
      <ProductForm
        action={createProductAction}
        categories={flattenCategories(categories)}
        brands={brands}
        canEditPrice={hasPermission(admin, "price.create")}
        error={error}
      />
    </div>
  );
}
