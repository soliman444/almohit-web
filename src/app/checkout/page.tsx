import Link from "next/link";
import { redirect } from "next/navigation";
import { OnceForm, OnceSubmit } from "../../components/storefront/once-submit";
import { StorefrontShell } from "../../components/storefront/shell";
import { requireUser } from "../../lib/auth";
import { getCurrentCart, isApprovedBuyer } from "../../lib/commerce";
import { placeOrderAction } from "../../lib/commerce-actions";
import { commerceMessage } from "../../lib/commerce-errors";
import { formatCurrencyFromUSD, formatUsdBase } from "../../lib/currency";
import { getDisplayCurrencyState } from "../../lib/display-currency";
import { prisma } from "../../lib/db/prisma";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  const cart = await getCurrentCart(user);
  const { code: currency, catalog } = await getDisplayCurrencyState();
  if (!cart || cart.items.length === 0 || !cart.canCheckout || !cart.id) {
    redirect(cart?.items.length ? "/cart?error=CHECKOUT" : "/cart?error=EMPTY");
  }
  const { address, error } = await searchParams;
  const addresses = await prisma.address.findMany({
    where: { customerId: user.customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  const selected = addresses.find((item) => item.id === address) ?? addresses.find((item) => item.isDefault) ?? null;

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/cart">Back to cart</Link>
        <p className="sf-kicker">Checkout</p>
        <h1>Confirm the order.</h1>
        {error && <p className="error">{commerceMessage(error)}</p>}
        <ul className="sf-cart-lines">
          {cart.items.map((item) => (
            <li key={item.id} className="sf-cart-line">
              <div>
                <b>{item.name}{item.variantName ? ` · ${item.variantName}` : ""}</b>
                <p>{item.quantity} × {formatCurrencyFromUSD(item.unitPrice, currency, catalog)}</p>
              </div>
              <p>{formatCurrencyFromUSD(item.lineTotal, currency, catalog)}</p>
            </li>
          ))}
        </ul>
        <p className="sf-cart-total">{formatCurrencyFromUSD(cart.subtotal, currency, catalog)}</p>
        <p className="muted">Base currency: {formatUsdBase(cart.subtotal)}</p>
        {addresses.length > 0 && (
          <nav className="sf-controls" aria-label="Saved addresses">
            {addresses.map((item) => (
              <Link key={item.id} className={selected?.id === item.id ? "is-active" : ""} href={`/checkout?address=${item.id}`}>
                {item.label || item.city}
              </Link>
            ))}
            <Link className={!selected ? "is-active" : ""} href="/checkout">New address</Link>
          </nav>
        )}
        <OnceForm className="sf-auth-form" action={placeOrderAction} style={{ padding: 0 }}>
          <input type="hidden" name="cartId" value={cart.id} />
          {selected && <input type="hidden" name="addressId" value={selected.id} />}
          <label className="sf-field">Recipient<input name="recipient" required defaultValue={selected?.recipient ?? user.name} /></label>
          <label className="sf-field">Phone<input name="phone" defaultValue={selected?.phone ?? user.phone ?? ""} /></label>
          <label className="sf-field">Address line 1<input name="line1" required defaultValue={selected?.line1 ?? ""} /></label>
          <label className="sf-field">Address line 2<input name="line2" defaultValue={selected?.line2 ?? ""} /></label>
          <label className="sf-field">City<input name="city" required defaultValue={selected?.city ?? ""} /></label>
          <label className="sf-field">Region<input name="region" defaultValue={selected?.region ?? ""} /></label>
          <label className="sf-field">Postal code<input name="postalCode" defaultValue={selected?.postalCode ?? ""} /></label>
          <label className="sf-field">Country<input name="country" defaultValue={selected?.country ?? "SA"} /></label>
          {!selected && (
            <label className="sf-field">
              <span><input type="checkbox" name="saveAddress" /> Save this address</span>
            </label>
          )}
          <label className="sf-field">Notes<textarea name="customerNotes" /></label>
          <label className="sf-field">
            Payment method
            <select name="paymentMethod" defaultValue="BANK_TRANSFER">
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CASH">Cash</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <OnceSubmit className="sf-btn"><span>Place order</span></OnceSubmit>
        </OnceForm>
      </main>
    </StorefrontShell>
  );
}
