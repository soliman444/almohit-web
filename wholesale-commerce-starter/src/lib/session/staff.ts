import { getOdooStaffUser, type CurrentCustomer } from "../odoo/auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  isStaff: true;
};

function toAuthUser(staff: CurrentCustomer): AuthUser {
  return {
    id: String(staff.userId),
    name: staff.name,
    email: staff.email,
    isStaff: true,
  };
}

export async function getCurrentStaff() {
  const staff = await getOdooStaffUser();
  return staff ? toAuthUser(staff) : null;
}

export async function destroySession() {
  // Storefront and staff sessions live on the Odoo session_id cookie.
}

export function isStaffUser(user: { isStaff?: boolean } | null | undefined) {
  return Boolean(user?.isStaff);
}
