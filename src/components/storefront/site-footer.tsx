import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="sf-footer">
      <p className="sf-footer-brand">almohit.</p>
      <div className="sf-footer-top">
        <div>
          <p>A wholesale catalog you can browse first. Trade prices after approval.</p>
          <p>hello@almohit.local</p>
        </div>
        <div>
          <p>Navigate</p>
          <Link href="/products">Products</Link>
          <Link href="/#discover">Collections</Link>
          <Link href="/about">About</Link>
        </div>
        <div>
          <p>Account</p>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
          <Link href="/account/business">Request approval</Link>
        </div>
        <div>
          <p>Social</p>
          <span>Instagram</span>
          <span>LinkedIn</span>
        </div>
      </div>
      <p className="sf-footer-final">The product first. The price later.</p>
      <div className="sf-footer-bottom">
        <span>© {new Date().getFullYear()} Almohit</span>
        <span>Trade prices after approval</span>
      </div>
    </footer>
  );
}
