import Link from "next/link";
import { requirePermission } from "../../lib/auth";
import { safeApiCall } from "../../lib/api/safe";
import { AdminHeader } from "../../components/admin/admin-ui";
import { getOdooAdminCatalogStats } from "../../lib/odoo/admin-taxonomy";
import { countOdooAdminCustomers, countOdooAdminStaff } from "../../lib/odoo/admin-customers";
import { countOdooAdminOrders } from "../../lib/odoo/admin-orders";
import { countOdooPendingTradeApplications } from "../../lib/odoo/admin-trade";
import { getOdooCurrencyCatalog } from "../../lib/currency-catalog";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePermission("user.view");
  const [customers, staff, pending, catalog, currencies, orders] = await Promise.all([
    loadCustomerCount(),
    loadStaffCount(),
    loadPendingTradeCount(),
    loadCatalogStats(),
    loadCurrencyCount(),
    loadOrderCount(),
  ]);

  const cards = [
    { href: "/admin/users?type=customer", label: "Customers", value: customers },
    { href: "/admin/users?type=staff", label: "Staff", value: staff },
    { href: "/admin/business-requests", label: "New trade requests", value: pending },
    { href: "/admin/products", label: "Products", value: catalog.products },
    { href: "/admin/categories", label: "Categories", value: catalog.categories },
    { href: "/admin/brands", label: "Brands", value: catalog.brands },
    { href: "/admin/currencies", label: "Display currencies", value: currencies },
    { href: "/admin/orders", label: "Orders", value: orders },
  ];

  return (
    <div className="stack">
      <AdminHeader title="Dashboard" hint="Staff, catalog, orders, and customers come from Odoo" />
      <div className="grid">
        {cards.map((card) => (
          <Link className="card admin-stat" href={card.href} key={card.href}>
            <span className="muted">{card.label}</span>
            <h2>{card.value}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function loadCatalogStats() {
  const loaded = await safeApiCall(() => getOdooAdminCatalogStats());
  if (!loaded.ok) return { products: "—", categories: "—", brands: "—" };
  return loaded.data;
}

async function loadPendingTradeCount() {
  const loaded = await safeApiCall(() => countOdooPendingTradeApplications());
  return loaded.ok ? loaded.data : "—";
}

async function loadOrderCount() {
  const loaded = await safeApiCall(() => countOdooAdminOrders());
  return loaded.ok ? loaded.data : "—";
}

async function loadCustomerCount() {
  const loaded = await safeApiCall(() => countOdooAdminCustomers());
  return loaded.ok ? loaded.data : "—";
}

async function loadStaffCount() {
  const loaded = await safeApiCall(() => countOdooAdminStaff());
  return loaded.ok ? loaded.data : "—";
}

async function loadCurrencyCount() {
  const payload = await getOdooCurrencyCatalog();
  return payload.currencies.length || "—";
}
