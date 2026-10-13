import Link from "next/link";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { safeApiCall } from "../../../lib/api/safe";
import { listMarketerMerchants } from "../../../lib/odoo/marketer";
import { requireMarketer } from "../../../lib/storefront-session";

export const dynamic = "force-dynamic";

export default async function MarketerMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireMarketer();
  const { created } = await searchParams;
  const loaded = await safeApiCall(() => listMarketerMerchants());
  if (!loaded.ok) return <StorefrontUnavailable />;
  const merchants = loaded.data;

  return (
    <StorefrontShell>
      <main className="sf-account sf-delivery-page">
        <Link className="sf-text-link" href="/account">Back to my account</Link>
        <p className="sf-kicker">Marketer</p>
        <h1>My merchants.</h1>
        {created && <p className="sf-invoice-banner" role="status">Merchant submitted for approval.</p>}
        <p><Link className="sf-btn" href="/account/merchants/new"><span>Add merchant</span><span className="sf-arrow" aria-hidden>→</span></Link></p>
        {merchants.length === 0 && <p>No shops enrolled yet. Add a merchant after visiting the shop.</p>}
        {merchants.length > 0 && (
          <div className="sf-cart-table-wrap">
            <table className="sf-cart-table">
              <thead>
                <tr>
                  <th scope="col">Shop</th>
                  <th scope="col">Owner</th>
                  <th scope="col">City</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.companyName}</th>
                    <td>{row.merchantEmail ?? "—"}</td>
                    <td>{row.city ?? "—"}</td>
                    <td><span className="sf-delivery-status">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </StorefrontShell>
  );
}
