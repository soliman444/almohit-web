import { redirect } from "next/navigation";
import { getOdooStaffUser, type CurrentCustomer } from "./odoo/auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  status: "ACTIVE";
  isStaff: true;
  roles: [];
};

function toAuthUser(staff: CurrentCustomer): AuthUser {
  return {
    id: String(staff.userId),
    name: staff.name,
    email: staff.email,
    status: "ACTIVE",
    isStaff: true,
    roles: [],
  };
}

export async function getCurrentUser() {
  const staff = await getOdooStaffUser();
  return staff ? toAuthUser(staff) : null;
}

export async function destroySession() {
  // Storefront and staff sessions live on the Odoo session_id cookie.
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function permissionSet(_user: AuthUser) {
  return new Set<string>(["odoo.staff"]);
}

export function isSuperAdmin(user: AuthUser) {
  return isStaffUser(user);
}

export function isStaffUser(user: { isStaff?: boolean } | null | undefined) {
  return Boolean(user?.isStaff);
}

export function hasPermission(user: AuthUser, _permission: string) {
  return isStaffUser(user);
}

export async function requirePermission(_permission: string) {
  const user = await requireUser();
  if (!isStaffUser(user)) redirect("/account");
  return user;
}
