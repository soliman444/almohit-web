import Link from "next/link";
import { MediaFrame } from "../../components/storefront/media-frame";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { loginAction } from "../../lib/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <StorefrontShell>
      <main className="sf-auth">
        <div className="sf-auth-visual">
          <MediaFrame src={EDITORIAL.honey} alt="Account entrance" sizes="50vw" priority preset="campaign" className="sf-fill" />
        </div>
        <form className="sf-auth-form" action={loginAction}>
          <p className="sf-kicker">Your account</p>
          <h1>Sign in to your price.</h1>
          <p className="sf-count">Approved buyers see their group prices after sign-in.</p>
          {error && <p className="error">Email or password is incorrect.</p>}
          <label className="sf-field">Email<input name="email" type="email" required autoComplete="email" /></label>
          <label className="sf-field">Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <button className="sf-btn" type="submit"><span>Sign in</span><span className="sf-arrow" aria-hidden>→</span></button>
          <p>No account yet? <Link className="sf-text-link" href="/register">Create account</Link></p>
        </form>
      </main>
    </StorefrontShell>
  );
}
