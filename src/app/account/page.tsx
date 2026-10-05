import Link from "next/link";
import { StorefrontShell } from "../../components/storefront/shell";
import { logoutAction } from "../../lib/actions";
import { requireUser } from "../../lib/auth";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <StorefrontShell>
      <main className="sf-account">
        <p className="sf-kicker">{user.customer?.businessStatus ?? "STAFF"}</p>
        <h1>Hello {user.name}</h1>
        <p className="sf-count">{user.email}</p>
        {user.customer && (
          <>
            <p>Business status: {user.customer.businessStatus}</p>
            <p>Price group: {user.customer.priceGroup?.name ?? "Not assigned yet"}</p>
            <Link className="sf-btn" href="/account/business"><span>Trade account</span><span className="sf-arrow" aria-hidden>→</span></Link>
            <Link className="sf-btn is-subtle" href="/account/orders"><span>Orders</span></Link>
            <Link className="sf-btn is-subtle" href="/account/addresses"><span>Addresses</span></Link>
            <Link className="sf-btn is-subtle" href="/cart"><span>Cart</span></Link>
          </>
        )}
        <form action={logoutAction}><button className="sf-btn is-subtle" type="submit"><span>Sign out</span></button></form>
      </main>
    </StorefrontShell>
  );
}
