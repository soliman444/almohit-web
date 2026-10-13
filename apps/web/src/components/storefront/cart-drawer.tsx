"use client";

import Link from "next/link";
import type { CartView } from "../../lib/cart-view";

export function CartDrawer({
  cart,
}: {
  cart: CartView | null;
  canBuy: boolean;
  signedIn: boolean;
}) {
  const count = cart?.itemCount ?? 0;
  return (
    <Link className="sf-nav-link" href="/cart">
      Cart{count ? ` ${String(count).padStart(2, "0")}` : ""}
    </Link>
  );
}
