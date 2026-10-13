"use client";

import Link from "next/link";

const links = [
  { href: "/products", label: "Products" },
  { href: "/#discover", label: "Collections" },
  { href: "/products?view=new", label: "New" },
  { href: "/about", label: "About" },
];

export function FloatingDock() {
  return (
    <div className="sf-dock" role="navigation" aria-label="Quick navigation">
      <button
        type="button"
        className="sf-dock-top"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <span aria-hidden>↑</span>
      </button>
      <nav className="sf-dock-pill">
        <Link className="sf-dock-mark" href="/">A</Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
      </nav>
      <Link className="sf-dock-cta" href="/register">Request.</Link>
    </div>
  );
}
