import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { submitBusinessRequestAction } from "../../../lib/actions";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";

export default async function BusinessPage() {
  const user = await requireUser();
  if (!user.customer) {
    return <StorefrontShell><main className="sf-account"><p>This account is not a customer account.</p></main></StorefrontShell>;
  }
  const latest = await prisma.businessRequest.findFirst({ where: { customerId: user.customer.id }, orderBy: { createdAt: "desc" } });
  const locked = user.customer.businessStatus === "APPROVED" || latest?.status === "PENDING";

  return (
    <StorefrontShell>
      <main className="sf-account">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Trade approval</p>
        <h1>Request a trade account</h1>
        <p className="sf-count">After approval, wholesale prices for your price group appear.</p>
        {latest && <p>Latest request: {latest.status}{latest.rejectionReason ? ` — ${latest.rejectionReason}` : ""}</p>}
        <form className="sf-auth-form" action={submitBusinessRequestAction} style={{ padding: 0 }}>
          <label className="sf-field">Business name<input name="businessName" defaultValue={user.customer.businessName ?? ""} required /></label>
          <label className="sf-field">Business type<input name="businessType" placeholder="Shop, distributor, company..." /></label>
          <label className="sf-field">City<input name="city" /></label>
          <label className="sf-field">Address<input name="address" /></label>
          <label className="sf-field">Phone<input name="phone" defaultValue={user.phone ?? ""} /></label>
          <label className="sf-field">Notes<textarea name="notes" /></label>
          <button className="sf-btn" type="submit" disabled={locked}>
            <span>{user.customer.businessStatus === "APPROVED" ? "Account approved" : latest?.status === "PENDING" ? "Request under review" : "Submit request"}</span>
          </button>
        </form>
      </main>
    </StorefrontShell>
  );
}
