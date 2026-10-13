"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
} from "../../lib/commerce-actions";
import type { AddressDto } from "@almohit/contracts";
import { OnceForm, OnceSubmit } from "./once-submit";

type BookAddress = AddressDto & {
  type?: "delivery" | "invoice";
  countryCode?: string | null;
  countryId?: string | null;
};

const COUNTRIES = [
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "YE", name: "Yemen" },
  { code: "KW", name: "Kuwait" },
  { code: "QA", name: "Qatar" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "EG", name: "Egypt" },
  { code: "JO", name: "Jordan" },
  { code: "IQ", name: "Iraq" },
];

function countryValue(address?: BookAddress) {
  const code = address?.countryCode || address?.country || "SA";
  return code.length === 2 ? code.toUpperCase() : "SA";
}

function AddressFields({
  address,
  defaultType,
  defaultName,
  defaultPhone,
}: {
  address?: BookAddress;
  defaultType: "delivery" | "invoice";
  defaultName: string;
  defaultPhone: string;
}) {
  const country = countryValue(address);
  const known = COUNTRIES.some((item) => item.code === country);
  return (
    <div className="sf-address-form">
      <label className="sf-field">
        Type
        <select name="type" defaultValue={address?.type ?? defaultType} required>
          <option value="delivery">Delivery</option>
          <option value="invoice">Invoice</option>
        </select>
      </label>
      <label className="sf-field">Label<input name="label" defaultValue={address?.label ?? ""} placeholder="Warehouse, shop…" /></label>
      <label className="sf-field">
        Recipient
        <input name="recipient" required defaultValue={address?.recipient ?? defaultName} />
      </label>
      <label className="sf-field">Phone<input name="phone" defaultValue={address?.phone ?? defaultPhone} /></label>
      <label className="sf-field is-wide">
        Address line 1
        <input name="line1" required defaultValue={address?.line1 ?? ""} />
      </label>
      <label className="sf-field is-wide">Address line 2<input name="line2" defaultValue={address?.line2 ?? ""} /></label>
      <label className="sf-field">City<input name="city" required defaultValue={address?.city ?? ""} /></label>
      <label className="sf-field">
        Region
        <input name="region" defaultValue={address?.region ?? ""} />
      </label>
      <p className="muted is-wide">Region/state is optional. Yemen does not require a state.</p>
      <label className="sf-field">Postal code<input name="postalCode" defaultValue={address?.postalCode ?? ""} /></label>
      <label className="sf-field">
        Country
        <select name="country" defaultValue={known ? country : "SA"} required>
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>{item.name}</option>
          ))}
        </select>
      </label>
      {address?.countryId && <input type="hidden" name="countryId" value={address.countryId} />}
    </div>
  );
}

function AddressCard({
  address,
  returnTo,
  defaultName,
  defaultPhone,
}: {
  address: BookAddress;
  returnTo: string;
  defaultName: string;
  defaultPhone: string;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="sf-address-card">
      <p className="sf-address-badge">{address.type === "invoice" ? "Invoice" : "Delivery"}</p>
      <p><b>{address.label || address.recipient}</b></p>
      <p>{address.recipient}</p>
      <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
      <p>{[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}</p>
      <p>{address.country}</p>
      {address.phone && <p>{address.phone}</p>}
      {!editing && (
        <div className="actions">
          <button className="sf-btn is-subtle" type="button" onClick={() => setEditing(true)}>
            <span>Edit</span>
          </button>
          <OnceForm action={deleteAddressAction}>
            <input type="hidden" name="id" value={address.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <OnceSubmit className="sf-text-link" pendingLabel="Archiving…">Archive</OnceSubmit>
          </OnceForm>
        </div>
      )}
      {editing && (
        <OnceForm className="sf-auth-form" action={updateAddressAction} style={{ padding: 0 }}>
          <input type="hidden" name="id" value={address.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <AddressFields
            address={address}
            defaultType={address.type === "invoice" ? "invoice" : "delivery"}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
          />
          <div className="actions">
            <OnceSubmit className="sf-btn" pendingLabel="Saving…"><span>Save address</span></OnceSubmit>
            <button className="sf-btn is-subtle" type="button" onClick={() => setEditing(false)}>
              <span>Cancel</span>
            </button>
          </div>
        </OnceForm>
      )}
    </article>
  );
}

export function AddressBook({
  addresses,
  defaultName,
  defaultPhone,
  defaultType,
  returnTo,
  saved,
}: {
  addresses: BookAddress[];
  defaultName: string;
  defaultPhone: string;
  defaultType: "delivery" | "invoice";
  returnTo: string;
  saved?: boolean;
}) {
  const delivery = addresses.filter((item) => item.type === "delivery");
  const invoice = addresses.filter((item) => item.type === "invoice");
  const fromCheckout = returnTo === "/checkout";
  return (
    <>
      {saved && <p role="status">Address saved.</p>}
      {fromCheckout && (
        <p>
          <Link className="sf-btn" href="/checkout"><span>Back to checkout</span></Link>
        </p>
      )}
      <section className="sf-address-section">
        <h2>Existing addresses</h2>
        <h3>Delivery address</h3>
        {delivery.length === 0 && (
          <p>
            No delivery address yet.
            {fromCheckout ? " Add one below, then return to checkout." : ""}
          </p>
        )}
        {delivery.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            returnTo={returnTo}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
          />
        ))}
        <h3>Invoice address</h3>
        {invoice.length === 0 && (
          <p>
            No invoice address yet.
            {fromCheckout ? " Add one below, then return to checkout." : ""}
          </p>
        )}
        {invoice.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            returnTo={returnTo}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
          />
        ))}
      </section>
      <section className="sf-address-section">
        <h2>Add new address</h2>
        <p>Use this form only to create a new address. Existing addresses stay collapsed until you click Edit.</p>
        <OnceForm className="sf-auth-form" action={createAddressAction} style={{ padding: 0 }}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <AddressFields
            defaultType={defaultType}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
          />
          <OnceSubmit className="sf-btn" pendingLabel="Adding…"><span>Add address</span></OnceSubmit>
        </OnceForm>
      </section>
    </>
  );
}
