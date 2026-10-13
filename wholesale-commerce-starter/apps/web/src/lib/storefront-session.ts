import { redirect } from "next/navigation";
import { getCurrentUser, isStaffUser, requireUser } from "./auth";
import { isApprovedBuyer } from "./commerce";
import { hasOdooSession, getCurrentCustomer as getOdooCustomer, type CurrentCustomer } from "./odoo/auth";

export function accountPageDestination(input: { isPrismaStaff: boolean; hasOdooCustomer: boolean }) {
  if (input.isPrismaStaff) return "/admin";
  if (input.hasOdooCustomer) return "/account";
  return "/login";
}

export async function redirectIfPrismaStaff() {
  const staff = await getCurrentUser();
  if (staff && staff.status === "ACTIVE" && isStaffUser(staff)) redirect("/admin");
}

export async function requireStorefrontApproved() {
  await redirectIfPrismaStaff();
  if (await hasOdooSession()) {
    const customer = await getOdooCustomer();
    if (!customer) redirect("/login");
    if (customer.tradeStatus !== "approved") redirect("/account/business");
    return { kind: "odoo" as const, customer };
  }
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  return { kind: "legacy" as const, user };
}

export type StorefrontApproved =
  | { kind: "odoo"; customer: CurrentCustomer }
  | { kind: "legacy"; user: Awaited<ReturnType<typeof requireUser>> };

export async function requireMarketer() {
  const session = await requireStorefrontApproved();
  if (session.kind !== "odoo" || session.customer.role !== "marketer") {
    redirect("/account");
  }
  return session;
}

export async function requireDistributor() {
  const session = await requireStorefrontApproved();
  if (session.kind !== "odoo" || session.customer.role !== "distributor") {
    redirect("/account");
  }
  return session;
}
