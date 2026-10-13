import Link from "next/link";
import { redirect } from "next/navigation";
import { OnceForm, OnceSubmit } from "../../../components/storefront/once-submit";
import { StorefrontShell } from "../../../components/storefront/shell";
import { TradeKycFields } from "../../../components/storefront/trade-kyc-fields";
import { submitBusinessRequestAction } from "../../../lib/actions";
import { parseAppRole } from "../../../lib/trade-kyc";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { getCurrentUser } from "../../../lib/api/auth";
import { getCurrentCustomer } from "../../../lib/api/customers";
import { safeApiCall } from "../../../lib/api/safe";
import { commerceMessage } from "../../../lib/commerce-errors";
import { hasOdooSession } from "../../../lib/odoo/auth";
import { getTradeApplication } from "../../../lib/odoo/trade";

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const odooSession = await hasOdooSession();
  if (!odooSession) redirect("/login");
  const loaded = await safeApiCall(async () => {
    const me = await getCurrentUser();
    if (!me.authenticated) return null;
    const customer = await getCurrentCustomer();
    const application = await getTradeApplication();
    return { me, customer, application };
  });
  if (!loaded.ok) return <StorefrontUnavailable />;
  if (!loaded.data) redirect("/login");
  const { customer, application } = loaded.data;
  if (!customer) {
    return <StorefrontShell><main className="sf-account"><p>This account is not a customer account.</p></main></StorefrontShell>;
  }

  const requestStatus = application?.status.toUpperCase() ?? null;
  const rejectionReason = application?.rejectionReason;
  const locked = customer.state === "APPROVED" || customer.state === "PENDING" || requestStatus === "PENDING";
  const defaultBusinessName = application?.companyName ?? customer.businessName ?? "";
  const role = parseAppRole(customer.role ?? "merchant");
  const copy = role === "buyer"
    ? {
      kicker: "Buyer",
      title: "Buyer account",
      intro: "Office details for wholesale approval. Review happens in Odoo.",
      submit: "Submit buyer request",
      kyc: "Fill registration, address, contact, and what you source.",
    }
    : role === "distributor"
      ? {
        kicker: "Distributor",
        title: "Distributor account",
        intro: "Fleet and coverage details for wholesale approval. Review happens in Odoo.",
        submit: "Submit distributor request",
        kyc: "Fill registration, depot address, contact, and coverage area.",
      }
      : role === "marketer"
      ? {
        kicker: "Marketer",
        title: "Marketer account",
        intro: "Coverage details so you can enroll shop merchants. Review happens in Odoo.",
        submit: "Submit marketer request",
        kyc: "Fill your name, coverage area, city, contact, and base address.",
      }
      : {
        kicker: "Merchant",
        title: "Merchant account",
        intro: "Shop, people, and payment details for wholesale approval. Review happens in Odoo.",
        submit: "Submit merchant request",
        kyc: "Fill registration, address, manager, bank account, and payment method.",
      };
  const statusClass = requestStatus === "APPROVED"
    ? "is-approved"
    : requestStatus === "PENDING"
      ? "is-pending"
      : requestStatus === "REJECTED"
        ? "is-rejected"
        : "";

  return (
    <StorefrontShell>
      <main className="sf-business-page">
        <header className="sf-biz-hero">
          <div className="sf-biz-hero-top">
            <Link className="sf-biz-back" href="/account">Back to my account</Link>
            {requestStatus && (
              <p className={`sf-biz-status ${statusClass}`}>
                {requestStatus}{rejectionReason ? ` — ${rejectionReason}` : ""}
              </p>
            )}
          </div>
          <div className="sf-biz-hero-copy">
            <p className="sf-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p className="sf-count">{copy.intro}</p>
          </div>
        </header>
        {error && (
          <p className="error sf-biz-error">
            {error === "unavailable"
              ? commerceMessage("SERVICE_UNAVAILABLE")
              : error === "image"
                ? "Upload a JPEG, PNG, GIF, or WebP shop photo under 5 MB."
                : error === "payment"
                  ? "Choose how the shop will pay."
                  : error === "role"
                    ? "Choose a valid account type."
                    : error === "kyc"
                      ? copy.kyc
                      : commerceMessage(error)}
          </p>
        )}
        <OnceForm className="sf-business-form" action={submitBusinessRequestAction}>
          <div className="sf-biz-panel">
            <TradeKycFields
              role={role}
              defaults={{
                businessName: defaultBusinessName,
                taxNumber: application?.taxNumber ?? "",
                businessType: application?.businessType ?? "",
                phone: application?.phone ?? customer.phone ?? "",
                city: application?.city ?? "",
                address: application?.street ?? "",
                managerName: application?.managerName ?? "",
                employeeName: application?.employeeName ?? "",
                bankAccount: application?.bankAccount ?? "",
                paymentMethod: application?.paymentMethod ?? "",
                notes: application?.notes ?? "",
              }}
            />
            <div className="sf-biz-actions">
              <OnceSubmit className="sf-btn" disabled={locked} pendingLabel="Submitting…">
                <span>
                  {customer.state === "APPROVED"
                    ? "Account approved"
                    : requestStatus === "PENDING"
                      ? "Request under review"
                      : copy.submit}
                </span>
              </OnceSubmit>
            </div>
          </div>
        </OnceForm>
      </main>
    </StorefrontShell>
  );
}
