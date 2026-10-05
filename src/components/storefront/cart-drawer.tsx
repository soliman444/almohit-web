"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { CartView } from "../../lib/commerce";
import { useFormatFromUSD } from "./display-currency";

export function CartDrawer({
  cart,
  canBuy,
  signedIn,
  children,
}: {
  cart: CartView | null;
  canBuy: boolean;
  signedIn: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const count = cart?.itemCount ?? 0;
  const formatMoney = useFormatFromUSD();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button className="sf-nav-link" type="button" onClick={() => setOpen(true)}>
        Cart{count ? ` ${String(count).padStart(2, "0")}` : ""}
      </button>
      {open && (
        <div className="sf-cart-layer">
          <button className="sf-cart-backdrop" type="button" aria-label="Close cart" onClick={() => setOpen(false)} />
          <aside className="sf-cart-drawer" aria-label="Cart">
            <div className="sf-menu-bar">
              <p className="sf-kicker">Cart</p>
              <button type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            {!signedIn && <p>Sign in with an approved trade account to buy.</p>}
            {signedIn && !canBuy && <p>Prices and cart open after trade approval.</p>}
            {canBuy && (!cart || cart.items.length === 0) && <p>The cart is empty.</p>}
            {canBuy && cart && cart.items.length > 0 && (
              <>
                {children}
                <p className="sf-cart-total">{formatMoney(cart.subtotal)}</p>
                {cart.canCheckout ? (
                  <Link className="sf-btn" href="/checkout"><span>Checkout</span></Link>
                ) : (
                  <Link className="sf-btn" href="/cart"><span>Review cart</span></Link>
                )}
                <Link className="sf-text-link" href="/cart">Open cart</Link>
              </>
            )}
            {!signedIn && <Link className="sf-btn" href="/login"><span>Log in</span></Link>}
            {signedIn && !canBuy && <Link className="sf-btn" href="/account/business"><span>Request approval</span></Link>}
          </aside>
        </div>
      )}
    </>
  );
}
