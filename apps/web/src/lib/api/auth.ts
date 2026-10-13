import type { AuthMeResponse } from "@almohit/contracts";

export async function getCurrentUser(): Promise<AuthMeResponse> {
  const odoo = await import("../odoo/auth");
  if (await odoo.getOdooStaffUser()) {
    return { authenticated: false, user: null };
  }
  if (await odoo.hasOdooSession()) {
    return odoo.getAuthMe();
  }
  return { authenticated: false, user: null };
}
