import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { requireUser } from "../../../lib/auth";
import { isApprovedBuyer } from "../../../lib/commerce";
import { createAddressAction, deleteAddressAction, setDefaultAddressAction, updateAddressAction } from "../../../lib/commerce-actions";
import { prisma } from "../../../lib/db/prisma";
import { redirect } from "next/navigation";

export default async function AddressesPage() {
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  const addresses = await prisma.address.findMany({
    where: { customerId: user.customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Addresses</p>
        <h1>Delivery addresses.</h1>
        {addresses.map((address) => (
          <form key={address.id} className="sf-auth-form" action={updateAddressAction} style={{ padding: 0, marginBottom: 32 }}>
            <input type="hidden" name="id" value={address.id} />
            <p>{address.isDefault ? "Default" : "Saved"}</p>
            <label className="sf-field">Label<input name="label" defaultValue={address.label ?? ""} /></label>
            <label className="sf-field">Recipient<input name="recipient" required defaultValue={address.recipient} /></label>
            <label className="sf-field">Phone<input name="phone" defaultValue={address.phone ?? ""} /></label>
            <label className="sf-field">Address line 1<input name="line1" required defaultValue={address.line1} /></label>
            <label className="sf-field">Address line 2<input name="line2" defaultValue={address.line2 ?? ""} /></label>
            <label className="sf-field">City<input name="city" required defaultValue={address.city} /></label>
            <label className="sf-field">Region<input name="region" defaultValue={address.region ?? ""} /></label>
            <label className="sf-field">Postal code<input name="postalCode" defaultValue={address.postalCode ?? ""} /></label>
            <label className="sf-field">Country<input name="country" defaultValue={address.country} /></label>
            <label className="sf-field"><span><input type="checkbox" name="isDefault" defaultChecked={address.isDefault} /> Default address</span></label>
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
        <form className="sf-auth-form" action={createAddressAction} style={{ padding: 0 }}>
          <label className="sf-field">Label<input name="label" /></label>
          <label className="sf-field">Recipient<input name="recipient" required defaultValue={user.name} /></label>
          <label className="sf-field">Phone<input name="phone" defaultValue={user.phone ?? ""} /></label>
          <label className="sf-field">Address line 1<input name="line1" required /></label>
          <label className="sf-field">Address line 2<input name="line2" /></label>
          <label className="sf-field">City<input name="city" required /></label>
          <label className="sf-field">Region<input name="region" /></label>
          <label className="sf-field">Postal code<input name="postalCode" /></label>
          <label className="sf-field">Country<input name="country" defaultValue="SA" /></label>
          <label className="sf-field"><span><input type="checkbox" name="isDefault" /> Default address</span></label>
          <button className="sf-btn" type="submit"><span>Add address</span></button>
        </form>
      </main>
    </StorefrontShell>
  );
}
