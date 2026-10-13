import Link from "next/link";
import { redirect } from "next/navigation";
import { StorefrontShell } from "../../components/storefront/shell";
import { logoutAction } from "../../lib/actions";
import { StorefrontUnavailable } from "../../components/system/storefront-unavailable";
import { safeApiCall } from "../../lib/api/safe";
import { redirectIfPrismaStaff } from "../../lib/storefront-session";

export default async function AccountPage() {
  await redirectIfPrismaStaff();

  const loaded = await safeApiCall(async () => {
    const odoo = await import("../../lib/odoo/auth");
    const me = await odoo.getAuthMe();
    if (!me.authenticated || !me.user) return null;
    const customer = await odoo.getCurrentCustomer();
    return { me, customer: customer ? odoo.toCustomerProfile(customer) : null };
  });
  if (!loaded.ok) return <StorefrontUnavailable />;
  if (!loaded.data?.customer) redirect("/login");
  const { me, customer } = loaded.data;
  return (
    <StorefrontShell>
      <main className="sf-account">
        <p className="sf-kicker">{customer.state}</p>
        <h1>Hello {me.user.name}</h1>
        <p className="sf-count">{me.user.email}</p>
        <p>Role: {customer.role === "buyer" ? "Buyer" : customer.role === "distributor" ? "Distributor" : customer.role === "marketer" ? "Marketer" : "Merchant"}</p>
        <p>Business status: {customer.state}</p>
        <p>Price group: {customer.priceGroupName ?? "Not assigned yet"}</p>
        {customer.role === "distributor" && (
          <Link className="sf-btn" href="/account/deliveries"><span>Deliveries</span><span className="sf-arrow" aria-hidden>→</span></Link>
        )}
        {customer.role === "marketer" && (
          <Link className="sf-btn" href="/account/merchants"><span>My merchants</span><span className="sf-arrow" aria-hidden>→</span></Link>
        )}
        <Link className="sf-btn" href="/account/business"><span>Trade account</span><span className="sf-arrow" aria-hidden>→</span></Link>
        {customer.role !== "marketer" && (
          <>
            <Link className="sf-btn is-subtle" href="/account/orders"><span>Orders</span></Link>
            <Link className="sf-btn is-subtle" href="/account/invoices"><span>Invoices</span></Link>
            <Link className="sf-btn is-subtle" href="/account/payments"><span>Payments</span></Link>
            <Link className="sf-btn is-subtle" href="/account/addresses"><span>Addresses</span></Link>
            <Link className="sf-btn is-subtle" href="/cart"><span>Cart</span></Link>
          </>
        )}
        <form action={logoutAction}><button className="sf-btn is-subtle" type="submit"><span>Sign out</span></button></form>
      </main>
    </StorefrontShell>
  );
}
