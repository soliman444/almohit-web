import type { AuthMeResponse } from "@almohit/contracts";
import { apiGet, hasApiSessionCookie } from "./client";

export async function getCurrentUser(): Promise<AuthMeResponse> {
  const { getCurrentUser: getPrismaUser, isStaffUser } = await import("../auth");
  const staff = await getPrismaUser();
  if (staff && staff.status === "ACTIVE" && isStaffUser(staff)) {
    return { authenticated: false, user: null };
  }
  const odoo = await import("../odoo/auth");
  if (await odoo.hasOdooSession()) {
    return odoo.getAuthMe();
  }
  if (!(await hasApiSessionCookie())) {
    return { authenticated: false, user: null };
  }
  return apiGet<AuthMeResponse>("/auth/me");
}
