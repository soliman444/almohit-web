import Link from "next/link";
import { redirect } from "next/navigation";
import { OnceSubmit } from "../../components/storefront/once-submit";
import { StorefrontShell } from "../../components/storefront/shell";
import { StorefrontUnavailable } from "../../components/system/storefront-unavailable";
import { safeApiCall } from "../../lib/api/safe";
import { loadCheckoutPage } from "../../lib/checkout-reads";
import { placeOrderAction } from "../../lib/commerce-actions";
import { placeOdooOrderAction } from "../../lib/place-order-action";
import { commerceMessage } from "../../lib/commerce-errors";
import { formatCompanyBase, formatDisplayMoney } from "../../lib/currency";
import { getDisplayCurrencyState } from "../../lib/display-currency";
import type { StorefrontAddress } from "../../lib/odoo/addresses";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; shipping?: string; invoice?: string; error?: string; available?: string }>;
}) {
  const { address, shipping, invoice, error, available } = await searchParams;
  const loaded = await safeApiCall(() => loadCheckoutPage({ address, shipping, invoice }));
  if (!loaded.ok) return <StorefrontUnavailable />;
  const model = loaded.data;
  if (model.type === "redirect") redirect(model.to);

  const { userName, userPhone, cart, addresses, selected } = model;
  const { code: currency, catalog } = await getDisplayCurrencyState();
  const tax = cart.amountTax;
  const total = cart.amountTotal ?? cart.subtotal;
  const saved = address === "saved";

  return (
    <StorefrontShell>
      <main className="sf-account sf-checkout-page">
        <Link className="sf-text-link" href="/cart">Back to cart</Link>
        <p className="sf-kicker">Checkout</p>
        <h1>Confirm the order.</h1>
        {saved && <p className="sf-cart-feedback" role="status">Address saved. Select it below and place the order.</p>}
        {error && <p className="error" role="alert">{commerceMessage(error, undefined, available)}</p>}
        <ul className="sf-cart-lines">
          {cart.items.map((item) => (
            <li key={item.id} className="sf-cart-line">
              <div>
                <b>{item.name}{item.variantName ? ` · ${item.variantName}` : ""}</b>
                <p>{item.quantity} × {formatDisplayMoney(item.unitPrice, currency, catalog)}</p>
              </div>
              <p>{formatDisplayMoney(item.lineTotal, currency, catalog)}</p>
            </li>
          ))}
        </ul>
        <p>Subtotal {formatDisplayMoney(cart.subtotal, currency, catalog)}</p>
        {tax != null && <p>Tax {formatDisplayMoney(tax, currency, catalog)}</p>}
        <p className="sf-cart-total">Total {formatDisplayMoney(total, currency, catalog)}</p>
        <p className="muted">Base currency: {formatCompanyBase(total, catalog)}</p>
        {model.paymentTerm && <p>Payment terms: {model.paymentTerm.name} (set on your account)</p>}

        {model.backend === "odoo" ? (
          <OdooCheckoutForm
            shippingAddresses={model.shippingAddresses}
            invoiceAddresses={model.invoiceAddresses}
            selectedShippingId={model.selectedShipping?.id}
            selectedInvoiceId={model.selectedInvoice?.id}
          />
        ) : (
          <>
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
            <form className="sf-auth-form" action={placeOrderAction} style={{ padding: 0 }}>
              <div className="sf-once-fields">
                <input type="hidden" name="cartId" value={cart.id} />
                {selected && <input type="hidden" name="addressId" value={selected.id} />}
                <label className="sf-field">Recipient<input name="recipient" required defaultValue={selected?.recipient ?? userName} /></label>
                <label className="sf-field">Phone<input name="phone" defaultValue={selected?.phone ?? userPhone ?? ""} /></label>
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
                <OnceSubmit className="sf-btn" pendingLabel="Placing order…"><span>Place order</span></OnceSubmit>
              </div>
            </form>
          </>
        )}
      </main>
    </StorefrontShell>
  );
}

function formatAddress(item: StorefrontAddress) {
  return [item.recipient, item.line1, item.city, item.country].filter(Boolean).join(" · ");
}

function OdooCheckoutForm({
  shippingAddresses,
  invoiceAddresses,
  selectedShippingId,
  selectedInvoiceId,
}: {
  shippingAddresses: StorefrontAddress[];
  invoiceAddresses: StorefrontAddress[];
  selectedShippingId?: string;
  selectedInvoiceId?: string;
}) {
  const ready = shippingAddresses.length > 0 && invoiceAddresses.length > 0;
  return (
    <div className="sf-checkout-block">
      {shippingAddresses.length === 0 && (
        <p className="sf-checkout-missing">
          Add a delivery address before placing the order.{" "}
          <Link className="sf-btn" href="/account/addresses?type=delivery&returnTo=/checkout">
            <span>Add delivery address</span>
          </Link>
        </p>
      )}
      {invoiceAddresses.length === 0 && (
        <p className="sf-checkout-missing">
          Add an invoice address before placing the order.{" "}
          <Link className="sf-btn" href="/account/addresses?type=invoice&returnTo=/checkout">
            <span>Add invoice address</span>
          </Link>
        </p>
      )}
      {ready && (
        <form className="sf-auth-form" action={placeOdooOrderAction} style={{ padding: 0 }}>
          <div className="sf-once-fields">
            <fieldset className="sf-checkout-addresses">
              <legend>Choose a delivery address</legend>
              {shippingAddresses.map((item) => (
                <label key={item.id} className="sf-address-choice">
                  <input
                    type="radio"
                    name="shippingAddressId"
                    value={item.id}
                    defaultChecked={(selectedShippingId ?? shippingAddresses[0].id) === item.id}
                  />
                  <span>{formatAddress(item)}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="sf-checkout-addresses">
              <legend>Invoice address</legend>
              {invoiceAddresses.map((item) => (
                <label key={item.id} className="sf-address-choice">
                  <input
                    type="radio"
                    name="invoiceAddressId"
                    value={item.id}
                    defaultChecked={(selectedInvoiceId ?? invoiceAddresses[0].id) === item.id}
                  />
                  <span>{formatAddress(item)}</span>
                </label>
              ))}
            </fieldset>
            <p>
              Need another address?{" "}
              <Link className="sf-text-link" href="/account/addresses?returnTo=/checkout">Add or edit addresses</Link>
            </p>
            <OnceSubmit className="sf-btn" pendingLabel="Placing order…"><span>Place order</span></OnceSubmit>
          </div>
        </form>
      )}
    </div>
  );
}
