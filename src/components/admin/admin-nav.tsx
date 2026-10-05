"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/attributes", label: "Attributes" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/currencies", label: "Currencies" },
  { href: "/admin/business-requests", label: "Trade requests" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
];

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="admin-side">
      <Link className="admin-brand" href="/admin">Almohit Admin</Link>
      <p className="admin-user">{userName}</p>
      <nav className="admin-nav" aria-label="Admin">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link className={active ? "is-active" : ""} href={link.href} key={link.href}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Link className="admin-storefront" href="/">View storefront</Link>
    </aside>
  );
}
