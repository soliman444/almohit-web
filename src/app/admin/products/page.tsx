import Link from "next/link";
import { deleteProductAction } from "../../../lib/actions";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { availableQuantity, primaryImage } from "../../../lib/catalog";
import { prisma } from "../../../lib/db/prisma";
import { insensitiveContains, queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../components/admin/confirm-submit";
import type { ProductStatus, ProductType } from "../../../../generated/prisma/client";

const STATUSES: ProductStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
const TYPES: ProductType[] = ["SIMPLE", "VARIABLE"];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; type?: string }>;
}) {
  const admin = await requirePermission("product.view");
  const params = await searchParams;
  const q = queryValue(params.q);
  const category = queryValue(params.category);
  const status = queryValue(params.status);
  const type = queryValue(params.type);
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(q ? { OR: [{ name: insensitiveContains(q) }, { sku: insensitiveContains(q) }, { slug: insensitiveContains(q) }] } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(STATUSES.includes(status as ProductStatus) ? { status: status as ProductStatus } : {}),
        ...(TYPES.includes(type as ProductType) ? { productType: type as ProductType } : {}),
      },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        inventory: true,
        variants: { include: { inventory: true } },
        media: { include: { media: { select: { filePath: true, altText: true } } }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const canCreate = hasPermission(admin, "product.create");
  const canUpdate = hasPermission(admin, "product.update");
  const canDelete = hasPermission(admin, "product.delete");

  return (
    <div className="stack">
      <AdminHeader
        title="Products"
        count={products.length}
        actions={canCreate ? <Link className="btn" href="/admin/products/new">New product</Link> : null}
      />
      <AdminFilters
        action="/admin/products"
        q={q}
        qPlaceholder="Name, SKU, or slug"
        filters={[
          { name: "category", label: "Category", value: category, options: categories.map((item) => ({ value: item.id, label: item.name })) },
          { name: "status", label: "Status", value: status, options: STATUSES.map((item) => ({ value: item, label: item })) },
          { name: "type", label: "Type", value: type, options: TYPES.map((item) => ({ value: item, label: item })) },
        ]}
      />
      <div className="card admin-table-wrap">
        {products.length === 0 ? (
          <AdminEmpty title="No products match these filters." hint="Clear search or add a new product." />
        ) : (
          <table className="table">
            <thead><tr><th>Image</th><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map((product) => {
                const image = primaryImage(product);
                const available =
                  product.productType === "VARIABLE"
                    ? product.variants.reduce((sum, variant) => sum + (variant.inventory ? availableQuantity(variant.inventory.quantity, variant.inventory.reservedQuantity) : 0), 0)
                    : product.inventory
                      ? availableQuantity(product.inventory.quantity, product.inventory.reservedQuantity)
                      : 0;
                const onHand =
                  product.productType === "VARIABLE"
                    ? product.variants.reduce((sum, variant) => sum + (variant.inventory?.quantity ?? 0), 0)
                    : product.inventory?.quantity ?? 0;
                return (
                  <tr key={product.id}>
                    <td>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={image.src} alt={image.alt || product.name} />
                      ) : <div className="thumb placeholder" />}
                    </td>
                    <td>
                      <b>{product.name}</b>
                      <br />
                      <span className="muted">{product.brand?.name ?? "No brand"} · {product.productType === "VARIABLE" ? "Variable" : "Simple"}</span>
                    </td>
                    <td>{product.sku}</td>
                    <td>{product.category.name}</td>
                    <td>{available} / {onHand}</td>
                    <td><StatusBadge value={product.status} /></td>
                    <td>
                      <div className="actions">
                        {canUpdate && <Link className="btn secondary" href={`/admin/products/${product.id}/edit`}>Edit</Link>}
                        {canDelete && (
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <ConfirmSubmit className="btn danger" message="Delete this product?">Delete</ConfirmSubmit>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
