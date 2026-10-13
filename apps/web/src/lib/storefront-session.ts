import { redirect } from "next/navigation";
import { getCurrentUser, isStaffUser } from "./auth";
import { hasOdooSession, getCurrentCustomer as getOdooCustomer, type CurrentCustomer } from "./odoo/auth";

export function accountPageDestination(input: { isPrismaStaff: boolean; hasOdooCustomer: boolean }) {
  if (input.isPrismaStaff) return "/admin";
  if (input.hasOdooCustomer) return "/account";
  return "/login";
}

export async function redirectIfPrismaStaff() {
  const staff = await getCurrentUser();
  if (staff && isStaffUser(staff)) redirect("/admin");
}

export async function requireStorefrontApproved() {
  await redirectIfPrismaStaff();
  if (await hasOdooSession()) {
    const customer = await getOdooCustomer();
    if (!customer) redirect("/login");
    if (customer.tradeStatus !== "approved") redirect("/account/business");
    return { kind: "odoo" as const, customer };
  }
  redirect("/login");
}

export type StorefrontApproved =
  | { kind: "odoo"; customer: CurrentCustomer };

export async function requireMarketer() {
  const session = await requireStorefrontApproved();
  if (session.customer.role !== "marketer") {
    redirect("/account");
  }
  return session;
}

export async function requireDistributor() {
  const session = await requireStorefrontApproved();
  if (session.customer.role !== "distributor") {
    redirect("/account");
  }
  return session;
}
