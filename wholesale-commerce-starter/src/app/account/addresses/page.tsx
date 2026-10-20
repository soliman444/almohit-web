import Link from "next/link";
import { AddressBook } from "../../../components/storefront/address-book";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getAddresses } from "../../../lib/commerce/addresses";
import { safeApiCall } from "../../../lib/odoo/safe";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from "../../../lib/actions/addresses";
import { safeStorefrontReturnTo } from "../../../lib/catalog/paths";
import { commerceMessage } from "../../../lib/commerce/errors";
import { requireMerchant } from "../../../lib/session/access";
import type { StorefrontAddress } from "../../../lib/odoo/addresses";
import { OnceForm, OnceSubmit } from "../../../components/storefront/once-submit";

export const dynamic = "force-dynamic";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string; returnTo?: string; saved?: string }>;
}) {
  const session = await requireMerchant();
  const { error, type, returnTo: rawReturn, saved } = await searchParams;
  const loaded = await safeApiCall(() => getAddresses());
  if (!loaded.ok) return <StorefrontUnavailable />;
  const addresses = loaded.data;
  const odoo = true;
  const defaultName = session.customer.name;
  const defaultPhone = session.customer.phone ?? "";
  const returnTo = safeStorefrontReturnTo(rawReturn ?? "", "/account/addresses");
  const defaultType = type === "invoice" ? "invoice" : "delivery";

  return (
    <StorefrontShell>
      <main className="sf-account sf-addresses-page">
        <Link className="sf-text-link" href={returnTo === "/checkout" ? "/checkout" : "/account"}>
          {returnTo === "/checkout" ? "Back to checkout" : "Back to my account"}
        </Link>
        <p className="sf-kicker">Addresses</p>
        <h1>Delivery and invoice addresses.</h1>
        {returnTo === "/checkout" && (
          <p>Saved addresses are listed as cards. Edit only opens when you ask for it. After you add an address, you can return to checkout.</p>
        )}
        {error && <p className="error" role="alert">{commerceMessage(error)}</p>}
        {odoo ? (
          <AddressBook
            addresses={addresses as StorefrontAddress[]}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
            defaultType={defaultType}
            returnTo={returnTo}
            saved={saved === "1"}
          />
        ) : (
          <LegacyAddressForms
            addresses={addresses as StorefrontAddress[]}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
          />
        )}
      </main>
    </StorefrontShell>
  );
}

function LegacyAddressForms({
  addresses,
  defaultName,
  defaultPhone,
}: {
  addresses: StorefrontAddress[];
  defaultName: string;
  defaultPhone: string;
}) {
  return (
    <>
      {addresses.map((address) => (
        <form key={address.id} className="sf-auth-form" action={updateAddressAction} style={{ padding: 0, marginBottom: 32 }}>
          <input type="hidden" name="id" value={address.id} />
          <p>{address.isDefault ? "Default" : "Saved"}</p>
          <div className="sf-address-form">
            <label className="sf-field">Label<input name="label" defaultValue={address.label ?? ""} /></label>
            <label className="sf-field">Recipient<input name="recipient" required defaultValue={address.recipient} /></label>
            <label className="sf-field">Phone<input name="phone" defaultValue={address.phone ?? ""} /></label>
            <label className="sf-field is-wide">Address line 1<input name="line1" required defaultValue={address.line1} /></label>
            <label className="sf-field is-wide">Address line 2<input name="line2" defaultValue={address.line2 ?? ""} /></label>
            <label className="sf-field">City<input name="city" required defaultValue={address.city} /></label>
            <label className="sf-field">Region<input name="region" defaultValue={address.region ?? ""} /></label>
            <label className="sf-field">Postal code<input name="postalCode" defaultValue={address.postalCode ?? ""} /></label>
            <label className="sf-field">Country<input name="country" defaultValue={address.country} /></label>
            <label className="sf-field is-wide"><span><input type="checkbox" name="isDefault" defaultChecked={address.isDefault} /> Default address</span></label>
          </div>
          <div className="actions">
            <button className="sf-btn" type="submit"><span>Save</span></button>
          </div>
        </form>
      ))}
      {addresses.map((address) => (
        <div key={`${address.id}-tools`} className="actions" style={{ marginBottom: 24 }}>
          {!address.isDefault && (
            <form action={setDefaultAddressAction}>
              <input type="hidden" name="id" value={address.id} />
              <button className="sf-text-link" type="submit">Make default</button>
            </form>
          )}
          <form action={deleteAddressAction}>
            <input type="hidden" name="id" value={address.id} />
            <button className="sf-text-link" type="submit">Delete</button>
          </form>
        </div>
      ))}
      <h2>New address</h2>
      <OnceForm className="sf-auth-form" action={createAddressAction} style={{ padding: 0 }}>
        <div className="sf-address-form">
          <label className="sf-field">Label<input name="label" /></label>
          <label className="sf-field">Recipient<input name="recipient" required defaultValue={defaultName} /></label>
          <label className="sf-field">Phone<input name="phone" defaultValue={defaultPhone} /></label>
          <label className="sf-field is-wide">Address line 1<input name="line1" required /></label>
          <label className="sf-field is-wide">Address line 2<input name="line2" /></label>
          <label className="sf-field">City<input name="city" required /></label>
          <label className="sf-field">Region<input name="region" /></label>
          <label className="sf-field">Postal code<input name="postalCode" /></label>
          <label className="sf-field">Country<input name="country" defaultValue="SA" /></label>
          <label className="sf-field is-wide"><span><input type="checkbox" name="isDefault" /> Default address</span></label>
        </div>
        <OnceSubmit className="sf-btn" pendingLabel="Adding…"><span>Add address</span></OnceSubmit>
      </OnceForm>
    </>
  );
}
