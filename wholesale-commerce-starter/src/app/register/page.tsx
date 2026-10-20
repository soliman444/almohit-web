import Link from "next/link";
import { StorefrontShell } from "../../components/storefront/shell";
import { OnceForm, OnceSubmit } from "../../components/storefront/once-submit";
import { RegisterKycFields } from "../../components/storefront/register-kyc-fields";
import { registerAction } from "../../lib/actions/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const errorText = error === "exists"
    ? "An account with these details already exists."
    : error === "password"
      ? "Password must be at least 8 characters."
      : error === "role"
        ? "Choose merchant, buyer, distributor, or marketer."
        : error === "account"
          ? "Fill your name, email, and a password of at least 8 characters."
        : error === "kyc"
          ? "Fill the trade details for the account type you selected."
        : error === "image"
          ? "Upload a JPEG, PNG, GIF, or WebP shop photo under 5 MB."
        : error === "payment"
          ? "Choose how the shop will pay."
        : error === "unavailable"
          ? "The store service is temporarily unavailable. Please try again shortly."
          : null;

  return (
    <StorefrontShell>
      <main className="sf-business-page">
        <header className="sf-biz-hero">
          <div className="sf-biz-hero-copy">
            <p className="sf-kicker">Trade account</p>
            <h1>Create the account and request approval.</h1>
            <p className="sf-count">One form. Review happens in Odoo before wholesale prices and orders.</p>
          </div>
        </header>
        {errorText && <p className="error sf-biz-error">{errorText}</p>}
        <OnceForm className="sf-business-form" action={registerAction}>
          <div className="sf-biz-panel">
            <section className="sf-biz-block">
              <h2>Login</h2>
              <div className="sf-biz-grid">
                <label className="sf-biz-field">Name<input name="name" required dir="auto" /></label>
                <label className="sf-biz-field">Email<input name="email" type="email" required dir="auto" /></label>
                <label className="sf-biz-field">Password<input name="password" type="password" minLength={8} required /></label>
              </div>
            </section>
            <RegisterKycFields />
            <div className="sf-biz-actions">
              <OnceSubmit className="sf-btn" pendingLabel="Submitting…">
                <span>Submit for review</span>
                <span className="sf-arrow" aria-hidden>→</span>
              </OnceSubmit>
            </div>
          </div>
        </OnceForm>
        <p>Already have an account? <Link className="sf-text-link" href="/login">Sign in</Link></p>
      </main>
    </StorefrontShell>
  );
}
