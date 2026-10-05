import Link from "next/link";
import { CartLines } from "../../components/storefront/cart-lines";
import { StorefrontShell } from "../../components/storefront/shell";
import { getCurrentUser } from "../../lib/auth";
import { getCurrentCart, isApprovedBuyer } from "../../lib/commerce";
import { clearCartAction } from "../../lib/commerce-actions";
import { commerceMessage } from "../../lib/commerce-errors";
import { formatCurrencyFromUSD, formatUsdBase } from "../../lib/currency";
import { getDisplayCurrencyState } from "../../lib/display-currency";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const cart = await getCurrentCart(user);
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const { error } = await searchParams;

  return (
    <StorefrontShell>
      <main className="sf-account">
        <p className="sf-kicker">Cart</p>
        <h1>Your order list.</h1>
        {error && <p className="error">{commerceMessage(error)}</p>}
        {!user && <p>Log in with an approved trade account to use the cart.</p>}
        {user && !isApprovedBuyer(user) && <p>The cart opens after trade approval.</p>}
        {isApprovedBuyer(user) && (!cart || cart.items.length === 0) && <p>The cart is empty.</p>}
        {cart && cart.items.length > 0 && (
          <>
            <CartLines items={cart.items} next="/cart" />
            <p className="sf-cart-total">{formatCurrencyFromUSD(cart.subtotal, currency, catalog)}</p>
            {currency !== "USD" && <p className="muted">Base currency: {formatUsdBase(cart.subtotal)}</p>}
            {!cart.canCheckout && <p className="error">{commerceMessage("CHECKOUT")}</p>}
            <div className="actions">
              {cart.canCheckout ? (
                <Link className="sf-btn" href="/checkout"><span>Checkout</span></Link>
              ) : (
                <p>Remove or update unavailable items before checkout.</p>
              )}
              <form action={clearCartAction}><button className="sf-btn is-subtle" type="submit">Clear cart</button></form>
            </div>
          </>
        )}
      </main>
    </StorefrontShell>
  );
}
