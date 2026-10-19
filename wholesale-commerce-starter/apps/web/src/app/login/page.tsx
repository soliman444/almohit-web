import Link from "next/link";
import { MediaFrame } from "../../components/storefront/media-frame";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { OnceForm, OnceSubmit } from "../../components/storefront/once-submit";
import { loginAction } from "../../lib/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <StorefrontShell>
      <main className="sf-auth">
        <div className="sf-auth-visual">
          <MediaFrame src={EDITORIAL.honey} alt="Account entrance" sizes="50vw" priority preset="campaign" className="sf-fill" />
        </div>
        <OnceForm className="sf-auth-form" action={loginAction}>
          <p className="sf-kicker">Your account</p>
          <h1>Sign in to your price.</h1>
          <p className="sf-count">Approved buyers see their group prices after sign-in. Staff use the same login as Odoo.</p>
          {error === "invalid" && <p className="error">Email or password is incorrect.</p>}
          {error === "unavailable" && <p className="error">The store service is temporarily unavailable. Please try again shortly.</p>}
          <label className="sf-field">Email<input name="email" required autoComplete="email" /></label>
          <label className="sf-field">Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <OnceSubmit className="sf-btn" pendingLabel="Signing in…"><span>Sign in</span><span className="sf-arrow" aria-hidden>→</span></OnceSubmit>
          <p>No account yet? <Link className="sf-text-link" href="/register">Create account</Link></p>
        </OnceForm>
      </main>
    </StorefrontShell>
  );
}
