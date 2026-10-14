import Link from "next/link";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import {
  adminProductBrandLabel,
  adminProductSkuLabel,
  adminProductStatusLabel,
  adminProductStockLabel,
  adminProductTypeLabel,
  adminProductCostLabel,
  adminProductWholesaleLabel,
  listOdooAdminProductOptions,
  listOdooAdminProducts,
  odooBackendProductUrl,
  rewriteAdminProductImage,
  withVariableWholesalePrices,
} from "../../../lib/odoo/admin-products";
import { FiShoppingBag } from "react-icons/fi";

const STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const TYPES = ["SIMPLE", "VARIABLE"] as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; type?: string; created?: string }>;
}) {
  const admin = await requirePermission("product.view");
  const params = await searchParams;
  const createdId = queryValue(params.created);
  const q = queryValue(params.q);
  const category = queryValue(params.category);
  const status = queryValue(params.status);
  const type = queryValue(params.type);
  const canCreate = hasPermission(admin, "product.create");
  const canUpdate = hasPermission(admin, "product.update");

  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="Products" actions={canCreate ? <Link className="btn" href="/admin/products/new">New product</Link> : null} />
        <p className="error">Odoo staff credentials are not configured. The admin catalog reads Odoo only.</p>
      </div>
    );
  }

  let products;
  let categories;
  try {
    const [listed, options] = await Promise.all([
      listOdooAdminProducts({ q, categoryId: category, status, type }),
      listOdooAdminProductOptions(),
    ]);
    products = await withVariableWholesalePrices(listed);
    categories = options.categories;
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Products" actions={canCreate ? <Link className="btn" href="/admin/products/new">New product</Link> : null} />
        <p className="error">Odoo admin products could not be loaded. Confirm the internal staff account can read products.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminHeader
        title="Products"
        count={products.length}
        hint="Odoo catalog"
        actions={canCreate ? <Link className="btn" href="/admin/products/new">New product</Link> : null}
      />
      {createdId && (
        <p className="muted">
          Created in Odoo as a native product. It is in this list and live on the storefront if saleable:{" "}
          <Link href={`/products/${createdId}`}>View on storefront</Link>. Continue full management in Odoo.
        </p>
      )}
      <AdminFilters
        action="/admin/products"
        q={q}
        qPlaceholder="Product name or SKU"
        filters={[
          { name: "category", label: "Category", value: category, options: categories.map((item) => ({ value: String(item.id), label: item.complete_name || item.name })) },
          { name: "status", label: "Status", value: status, options: STATUSES.map((item) => ({ value: item, label: adminProductStatusLabel(item) })) },
          { name: "type", label: "Type", value: type, options: TYPES.map((item) => ({ value: item, label: item === "VARIABLE" ? "Variable" : "Simple" })) },
        ]}
      />
      <div className="card admin-table-wrap is-fit">
        {products.length === 0 ? (
          <AdminEmpty title="No products match these filters." hint="Clear search or add a new product." />
        ) : (
          <table className="table admin-products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product name</th>
                <th>Type</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Stock</th>
                <th>Cost</th>
                <th>Wholesale price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const image = rewriteAdminProductImage(product.image_url);
                const highlighted = createdId === String(product.id);
                const typeLabel = adminProductTypeLabel(product);
                const saleable = product.active && product.sale_ok;
                return (
                  <tr key={product.id} data-created={highlighted ? "true" : undefined}>
                    <td>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={image} alt={product.name} />
                      ) : <div className="thumb placeholder" aria-hidden />}
                    </td>
                    <td><span className="admin-product-name">{product.name}</span></td>
                    <td>
                      <div className="admin-product-type">
                        <span>{typeLabel.primary}</span>
                        {typeLabel.secondary ? <span className="muted">{typeLabel.secondary}</span> : null}
                      </div>
                    </td>
                    <td className="admin-product-sku">{adminProductSkuLabel(product)}</td>
                    <td>{product.category?.name ?? "—"}</td>
                    <td>{adminProductBrandLabel(product)}</td>
                    <td className="admin-product-stock">{adminProductStockLabel(product)}</td>
                    <td className="admin-product-price">{adminProductCostLabel(product)}</td>
                    <td className="admin-product-price">{adminProductWholesaleLabel(product)}</td>
                    <td>
                      <StatusBadge value={product.status} label={adminProductStatusLabel(product.status)} />
                    </td>

                    <td>
                      <div className="admin-product-actions">
                        {canUpdate ? (
                          <Link className="btn secondary" href={`/admin/products/${product.id}/edit`}>Edit</Link>
                        ) : null}
                        {saleable ? (
                          <Link
                            className="btn secondary"
                            href={`/products/${product.id}`}
                          >
                            <FiShoppingBag size={20} aria-hidden="true" />
                          </Link>
                        ) : null}
                        <Link
                          className="btn secondary"
                          href={odooBackendProductUrl(product.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Manage in Odoo
                        </Link>
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
