import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../../../components/admin/admin-ui";
import { hasPermission, requirePermission } from "../../../../../lib/auth";
import {
  adminProductCostLabel,
  adminProductStatusLabel,
  adminProductStockLabel,
  adminProductWholesaleLabel,
  getOdooAdminProduct,
  odooBackendProductUrl,
  rewriteAdminProductImage,
} from "../../../../../lib/odoo/admin-products";
import { parseOdooRecordId } from "../../../../../lib/odoo/catalog";
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("product.update");
  const { id } = await params;
  const productId = parseOdooRecordId(id);
  if (!productId) notFound();

  let product;
  try {
    product = await getOdooAdminProduct(productId);
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Product" actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
        <p className="error">This product could not be loaded from Odoo.</p>
      </div>
    );
  }
  if (!product) notFound();

  const image = rewriteAdminProductImage(product.image_url);
  const canCreate = hasPermission(admin, "product.create");

  return (
    <div className="stack">
      <AdminHeader
        title={product.name}
        hint="Odoo product"
        actions={(
          <>
            <Link className="btn secondary" href="/admin/products">Back to products</Link>
            <Link className="btn" href={odooBackendProductUrl(product.id)} target="_blank" rel="noreferrer">
              Manage in Odoo
            </Link>
          </>
        )}
      />
      <div className="card stack">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={image} alt={product.name} />
        ) : null}
        <p><strong>SKU</strong> {product.sku || "—"}</p>
        <p><strong>Status</strong> {adminProductStatusLabel(product.status)}</p>
        <p><strong>Stock</strong> {adminProductStockLabel(product)}</p>
        <p><strong>Cost</strong> {adminProductCostLabel(product)}</p>
        <p><strong>Wholesale price</strong> {adminProductWholesaleLabel(product)}</p>
        {product.variants.length > 1 ? (
          <div className="admin-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Cost</th>
                  <th>Wholesale</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{variant.attributes.map((item) => item.value).join(" / ") || variant.sku || variant.id}</td>
                    <td>{variant.sku || "—"}</td>
                    <td>{adminProductCostLabel({ ...product, variants: [variant], cost: variant.cost })}</td>
                    <td>{adminProductWholesaleLabel({ ...product, variants: [variant], wholesale_price: variant.wholesale_price })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="muted">
          Cost is Odoo <code>standard_price</code>. Change it in Odoo; the website does not dual-write Prisma.
          {canCreate ? " New products can set cost from the website create form." : ""}
        </p>
      </div>
    </div>
  );
}
