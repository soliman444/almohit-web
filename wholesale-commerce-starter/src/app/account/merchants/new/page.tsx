import Link from "next/link";
import { OnceForm, OnceSubmit } from "../../../../components/storefront/once-submit";
import { StorefrontShell } from "../../../../components/storefront/shell";
import { createMarketerMerchantAction } from "../../../../lib/actions/marketer";
import { requireMarketer } from "../../../../lib/session/access";

export const dynamic = "force-dynamic";

export default async function NewMerchantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireMarketer();
  const { error } = await searchParams;
  const errorText = error === "exists"
    ? "An account with this email already exists."
    : error === "password"
      ? "Password must be at least 8 characters."
      : error === "image"
        ? "Upload a JPEG, PNG, GIF, or WebP shop photo under 5 MB."
        : error === "payment"
          ? "Choose how the shop will pay."
          : error === "unavailable"
            ? "The store service is temporarily unavailable."
            : error === "kyc"
              ? "Fill shop name, commercial registration, address, manager, bank account, and payment method."
              : null;

  return (
    <StorefrontShell>
      <main className="sf-business-page">
        <header className="sf-biz-hero">
          <div className="sf-biz-hero-top">
            <Link className="sf-biz-back" href="/account/merchants">Back to my merchants</Link>
          </div>
          <div className="sf-biz-hero-copy">
            <p className="sf-kicker">Marketer</p>
            <h1>Enroll a shop.</h1>
            <p className="sf-count">Enter the merchant login and shop KYC while you are at the store.</p>
          </div>
        </header>
        {errorText && <p className="error sf-biz-error">{errorText}</p>}
        <OnceForm className="sf-business-form" action={createMarketerMerchantAction}>
          <div className="sf-biz-panel">
            <section className="sf-biz-block">
              <h2>Merchant login</h2>
              <div className="sf-biz-grid">
                <label className="sf-biz-field">Owner name<input name="name" required dir="auto" /></label>
                <label className="sf-biz-field">Email<input name="email" type="email" required dir="auto" /></label>
                <label className="sf-biz-field">Password<input name="password" type="password" minLength={8} required /></label>
                <label className="sf-biz-field">Phone<input name="phone" dir="auto" /></label>
              </div>
            </section>
            <section className="sf-biz-block">
              <h2>Shop</h2>
              <div className="sf-biz-grid">
                <label className="sf-biz-field">Shop name<input name="companyName" required dir="auto" /></label>
                <label className="sf-biz-field">Commercial registration<input name="taxNumber" required dir="auto" /></label>
                <label className="sf-biz-field">Business type<input name="businessType" placeholder="Grocery, dates shop, wholesaler…" dir="auto" /></label>
                <label className="sf-biz-field">City<input name="city" required dir="auto" /></label>
                <label className="sf-biz-field is-span-3">Shop address<input name="address" required dir="auto" /></label>
              </div>
            </section>
            <section className="sf-biz-block">
              <h2>People & payment</h2>
              <div className="sf-biz-grid">
                <label className="sf-biz-field">Shop manager<input name="managerName" required dir="auto" /></label>
                <label className="sf-biz-field">Other employee<input name="employeeName" dir="auto" /></label>
                <label className="sf-biz-field">Bank account<input name="bankAccount" required dir="auto" /></label>
                <label className="sf-biz-field">Payment method
                  <select name="paymentMethod" required defaultValue="">
                    <option value="">Select payment method</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="both">Bank transfer or cash</option>
                  </select>
                </label>
                <label className="sf-biz-field is-span-2">Shop photo
                  <input name="shopImage" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
                </label>
                <label className="sf-biz-field is-span-2">Notes<textarea name="notes" dir="auto" /></label>
              </div>
            </section>
            <div className="sf-biz-actions">
              <OnceSubmit className="sf-btn" pendingLabel="Submitting…">
                <span>Submit merchant</span>
              </OnceSubmit>
            </div>
          </div>
        </OnceForm>
      </main>
    </StorefrontShell>
  );
}
