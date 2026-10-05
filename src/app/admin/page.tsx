import Link from "next/link";
import { requirePermission } from "../../lib/auth";
import { prisma } from "../../lib/db/prisma";
import { AdminHeader } from "../../components/admin/admin-ui";

export default async function AdminPage() {
  await requirePermission("user.view");
  const [users, pending, products, categories, brands, currencies, roles, orders] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.businessRequest.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.brand.count({ where: { deletedAt: null } }),
    prisma.displayCurrency.count(),
    prisma.role.count(),
    prisma.order.count(),
  ]);

  const cards = [
    { href: "/admin/users", label: "Users", value: users },
    { href: "/admin/business-requests", label: "New trade requests", value: pending },
    { href: "/admin/products", label: "Products", value: products },
    { href: "/admin/categories", label: "Categories", value: categories },
    { href: "/admin/brands", label: "Brands", value: brands },
    { href: "/admin/currencies", label: "Currencies", value: currencies },
    { href: "/admin/orders", label: "Orders", value: orders },
  ];

  return (
    <div className="stack">
      <AdminHeader title="Dashboard" hint={`${roles} roles defined`} />
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
