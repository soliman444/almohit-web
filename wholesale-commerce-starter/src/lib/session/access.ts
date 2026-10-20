import { redirect } from "next/navigation";
import { getCurrentStaff, isStaffUser } from "./staff";
import { hasOdooSession, getCurrentCustomer as getOdooCustomer, type CurrentCustomer } from "../odoo/auth";

export function accountPageDestination(input: { isStaff: boolean; hasOdooCustomer: boolean }) {
  if (input.isStaff) return "/";
  if (input.hasOdooCustomer) return "/account";
  return "/login";
}

export async function redirectIfStaff() {
  const staff = await getCurrentStaff();
  if (staff && isStaffUser(staff)) redirect("/");
}

export async function requireStorefrontApproved() {
  await redirectIfStaff();
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

export async function requireMerchant() {
  const session = await requireStorefrontApproved();
  if (session.customer.role !== "merchant") {
    redirect("/account");
  }
  return session;
}

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
