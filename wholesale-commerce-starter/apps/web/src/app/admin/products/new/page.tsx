import Link from "next/link";
import { createProductAction } from "../../../../lib/actions";
import { hasPermission, requirePermission } from "../../../../lib/auth";
import { AdminHeader } from "../../../../components/admin/admin-ui";
import { brandSelectOptions, categorySelectOptions, listOdooAdminProductOptions } from "../../../../lib/odoo/admin-products";
import { staffCredentialsConfigured } from "../../../../lib/odoo/staff";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const admin = await requirePermission("product.create");
  const { error } = await searchParams;
  if (!staffCredentialsConfigured()) {
    return (
      <div className="stack">
        <AdminHeader title="New product" actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
        <p className="error">Odoo staff credentials are not configured on the server. Product creation writes to Odoo only.</p>
      </div>
    );
  }

  let options;
  try {
    options = await listOdooAdminProductOptions();
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="New product" actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
        <p className="error">Odoo staff product options could not be loaded. Confirm the internal staff account can create products.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminHeader title="New product" actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
      <ProductForm
        action={createProductAction}
        categories={categorySelectOptions(options.categories)}
        brands={brandSelectOptions(options.brands)}
        attributes={options.attributes}
        canEditPrice={hasPermission(admin, "price.create")}
        canCreateCategory={hasPermission(admin, "category.create")}
        canCreateBrand={hasPermission(admin, "brand.create")}
        error={error}
        odooCreate
      />
    </div>
  );
}
