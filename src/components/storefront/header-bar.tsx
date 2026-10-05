"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { duration, easeOut, stagger } from "../../lib/motion";
import { logoutAction } from "../../lib/actions";
import type { CartView } from "../../lib/commerce";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import { CartDrawer } from "./cart-drawer";
import { CartLines } from "./cart-lines";
import { CurrencySelector } from "./currency-selector";

const links = [
  { href: "/products", label: "Products" },
  { href: "/#discover", label: "Collections" },
  { href: "/products?view=new", label: "New" },
  { href: "/about", label: "About" },
];

export function HeaderBar({
  transparent,
  signedIn,
  canAdmin,
  canBuy,
  cart,
  currency,
  currencies,
}: {
  transparent?: boolean;
  signedIn: boolean;
  canAdmin: boolean;
  canBuy: boolean;
  cart: CartView | null;
  currency: DisplayCurrencyCode;
  currencies: DisplayCurrencyConfig[];
}) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const [solid, setSolid] = useState(!transparent);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const isPdp = /^\/products\/[^/]+$/.test(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(!transparent || y > 8);
      setHidden(!menu && y > last && y > 140);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent, menu]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
      <header className={`sf-header ${solid ? "is-solid" : ""} ${hidden ? "is-hidden" : ""} ${isPdp ? "is-pdp" : ""}`}>
        <div className="sf-header-left">
          <button className="sf-nav-toggle" type="button" onClick={() => setMenu(true)} aria-expanded={menu}>
            Menu
          </button>
          <Link className="sf-logo" href="/">Almohit</Link>
          <nav className="sf-nav-desktop" aria-label="Main navigation">
            {links.map((link) => (
              <Link className="sf-nav-link" key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
        {!isPdp && (
          <form action="/products" className="sf-search-pill" role="search">
            <input name="q" placeholder="Search the catalog" />
          </form>
        )}
        <div className="sf-nav-tools">
          {isPdp && (
            <form action="/products" className={`sf-search-pill is-compact${searchOpen ? " is-open" : ""}`} role="search">
              {!searchOpen && (
                <button
                  type="button"
                  className="sf-search-icon"
                  aria-label="Search the catalog"
                  onClick={() => {
                    setSearchOpen(true);
                    requestAnimationFrame(() => searchInput.current?.focus());
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M12 12.5 16 16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <input
                ref={searchInput}
                name="q"
                placeholder="Search the catalog"
                onBlur={(event) => {
                  if (!event.currentTarget.value) setSearchOpen(false);
                }}
              />
            </form>
          )}
          <CurrencySelector current={currency} currencies={currencies} />
          <Link className="sf-nav-link" href={signedIn ? "/account" : "/login"}>{signedIn ? "My account" : "Log in"}</Link>
          <CartDrawer cart={cart} canBuy={canBuy} signedIn={signedIn}>
            {cart ? <CartLines items={cart.items} next="/" /> : null}
          </CartDrawer>
          {!signedIn && <Link className="sf-nav-link" href="/register">Sign up</Link>}
          {canAdmin && <Link className="sf-nav-link" href="/admin">Admin</Link>}
          <Link className="sf-btn is-compact" href="/register">Request</Link>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="sf-menu"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            <div className="sf-menu-bar">
              <Link className="sf-logo" href="/" onClick={() => setMenu(false)}>Almohit</Link>
              <button type="button" onClick={() => setMenu(false)}>Close</button>
            </div>
            <nav className="sf-menu-list">
              {links.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={reduce ? false : { y: 36, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: stagger.display * index, duration: duration.slow, ease: easeOut }}
                >
                  <Link href={link.href} onClick={() => setMenu(false)}>{link.label}</Link>
                </motion.div>
              ))}
              <motion.div
                initial={reduce ? false : { y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: stagger.display * links.length, duration: duration.slow, ease: easeOut }}
              >
                <CurrencySelector current={currency} currencies={currencies} placement="menu" />
              </motion.div>
              <motion.div
                initial={reduce ? false : { y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: stagger.display * (links.length + 1), duration: duration.slow, ease: easeOut }}
              >
                <Link href={signedIn ? "/account" : "/login"} onClick={() => setMenu(false)}>
                  {signedIn ? "My account" : "Log in"}
                </Link>
              </motion.div>
              <motion.div
                initial={reduce ? false : { y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: stagger.display * (links.length + 2), duration: duration.slow, ease: easeOut }}
              >
                <Link href="/cart" onClick={() => setMenu(false)}>Cart</Link>
              </motion.div>
              {signedIn && (
                <form action={logoutAction}><button type="submit">Sign out</button></form>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
