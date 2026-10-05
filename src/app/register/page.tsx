import Link from "next/link";
import { MediaFrame } from "../../components/storefront/media-frame";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { registerAction } from "../../lib/actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <StorefrontShell>
      <main className="sf-auth">
        <div className="sf-auth-visual">
          <MediaFrame src={EDITORIAL.coffee} alt="Create account" sizes="50vw" priority preset="campaign" className="sf-fill" />
        </div>
        <form className="sf-auth-form" action={registerAction}>
          <p className="sf-kicker">First step</p>
          <h1>Create the account, then request approval.</h1>
          {error === "exists" && <p className="error">An account with these details already exists.</p>}
          <label className="sf-field">Name<input name="name" required /></label>
          <label className="sf-field">Email<input name="email" type="email" required /></label>
          <label className="sf-field">Phone<input name="phone" /></label>
          <label className="sf-field">Password<input name="password" type="password" minLength={8} required /></label>
          <button className="sf-btn" type="submit"><span>Create account</span><span className="sf-arrow" aria-hidden>→</span></button>
          <p>Already have an account? <Link className="sf-text-link" href="/login">Sign in</Link></p>
        </form>
      </main>
    </StorefrontShell>
  );
}
