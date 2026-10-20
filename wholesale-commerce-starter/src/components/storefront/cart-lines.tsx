"use client";

import Link from "next/link";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "../../lib/actions/cart";
import type { CartView, CartViewItem } from "../../lib/commerce/cart-view";
import { commerceMessage } from "../../lib/commerce/errors";
import { companyCurrencyCode, formatCompanyBase, formatDisplayMoney } from "../../lib/currency/format";
import { useCartSession } from "./cart-session";
import { ClearCartButton } from "./clear-cart-button";
import { useFormatDisplayMoney } from "./display-currency";

export function CartLines({ items, next }: { items: CartViewItem[]; next: string }) {
  const formatMoney = useFormatDisplayMoney();
  const { cart, runCartMutation, pending } = useCartSession();
  const rows = cart?.items ?? items;
  return (
    <div className="sf-cart-table-wrap">
      <table className="sf-cart-table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col" className="is-num">MOQ</th>
            <th scope="col">Quantity</th>
            <th scope="col" className="is-num">Unit price</th>
            <th scope="col" className="is-num">Line total</th>
            <th scope="col"><span className="sf-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const href = `/products/${item.templateId || item.slug}`;
            const meta = [item.sku ? `SKU ${item.sku}` : null, item.uom, item.variantName].filter(Boolean).join(" · ");
            return (
              <tr key={`${item.id}:${item.quantity}`}>
                <th scope="row">
                  <Link href={href}>{item.name}</Link>
                  {meta ? <p className="muted">{meta}</p> : null}
                  {item.issue ? <p className="error">{commerceMessage(item.issue, undefined, item.available)}</p> : null}
                </th>
                <td className="is-num">{item.minOrderQuantity}</td>
                <td>
                  {item.issue !== "UNAVAILABLE" && item.issue !== "PRICE" ? (
                    <form
                      className="sf-cart-qty"
                      onSubmit={(event) => {
                        event.preventDefault();
                        runCartMutation(updateCartItemQuantityAction, new FormData(event.currentTarget));
                      }}
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="next" value={next} />
                      <label>
                        <span className="sf-sr-only">Quantity for {item.name}</span>
                        <input
                          name="quantity"
                          type="number"
                          min={item.minOrderQuantity}
                          {...(item.available > 0 ? { max: Math.max(item.available, item.minOrderQuantity) } : {})}
                          defaultValue={item.quantity}
                          disabled={pending}
                        />
                      </label>
                      <button className="sf-cart-inline" type="submit" disabled={pending}>
                        {pending ? "Updating…" : "Update"}
                      </button>
                    </form>
                  ) : (
                    item.quantity
                  )}
                </td>
                <td className="is-num">{formatMoney(item.unitPrice)}</td>
                <td className="is-num">{formatMoney(item.lineTotal)}</td>
                <td className="is-action">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      runCartMutation(removeCartItemAction, new FormData(event.currentTarget));
                    }}
                  >
                    <input type="hidden" name="itemId" value={item.id} />
                    <button className="sf-cart-inline" type="submit" disabled={pending}>
                      {pending ? "Removing…" : "Remove"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CartPageBody({
  initialCart,
  error,
  minQty,
  availableQty,
  currency,
  catalog,
  authenticated,
  canBuy,
}: {
  initialCart: CartView | null;
  error?: string;
  minQty?: string;
  availableQty?: string;
  currency: DisplayCurrencyCode;
  catalog: DisplayCurrencyConfig[];
  authenticated: boolean;
  canBuy: boolean;
}) {
  const { cart: liveCart, error: mutationError } = useCartSession();
  const cart = liveCart ?? initialCart;
  const tax = cart?.amountTax;
  const total = cart?.amountTotal ?? cart?.subtotal;

  return (
    <>
      {(error || mutationError) && (
        <p className="error" role="alert">{error ? commerceMessage(error, minQty, availableQty) : mutationError}</p>
      )}
      {!authenticated && (
        <p>
          Log in with an approved trade account to use the cart.{" "}
          <Link className="sf-text-link" href="/login">Sign in</Link>
        </p>
      )}
      {authenticated && !canBuy && (
        <p>
          The cart opens after trade approval.{" "}
          <Link className="sf-text-link" href="/account/business">Request a trade account</Link>
        </p>
      )}
      {canBuy && (!cart || cart.items.length === 0) && (
        <p>
          The cart is empty.{" "}
          <Link className="sf-text-link" href="/products">Browse products</Link>
        </p>
      )}
      {canBuy && cart && cart.items.length > 0 && (
        <>
          <p className="muted">{cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}</p>
          <CartLines items={cart.items} next="/cart" />
          <section className="sf-cart-summary" aria-label="Cart totals">
            <table className="sf-cart-totals">
              <tbody>
                <tr>
                  <th scope="row">Subtotal</th>
                  <td>{formatDisplayMoney(cart.subtotal, currency, catalog)}</td>
                </tr>
                {tax != null && (
                  <tr>
                    <th scope="row">Tax</th>
                    <td>{formatDisplayMoney(tax, currency, catalog)}</td>
                  </tr>
                )}
                <tr>
                  <th scope="row">Total</th>
                  <td className="sf-cart-total">{formatDisplayMoney(total ?? cart.subtotal, currency, catalog)}</td>
                </tr>
                {currency !== companyCurrencyCode(catalog) && (
                  <tr>
                    <th scope="row">Base currency</th>
                    <td className="muted">{formatCompanyBase(total ?? cart.subtotal, catalog)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          {!cart.canCheckout && <p className="error">{commerceMessage("CHECKOUT")}</p>}
          <div className="sf-cart-actions">
            {cart.canCheckout ? (
              <Link className="sf-btn" href="/checkout"><span>Proceed to checkout</span></Link>
            ) : (
              <p>Remove or update unavailable items before checkout.</p>
            )}
            <ClearCartButton />
          </div>
        </>
      )}
    </>
  );
}
