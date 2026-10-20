import type { AuthMeResponse, BusinessStatusResponse, CustomerProfile } from "@/types/contracts";

export async function getCurrentCustomerSession(): Promise<AuthMeResponse> {
  const odoo = await import("../odoo/auth");
  if (await odoo.getOdooStaffUser()) {
    return { authenticated: false, user: null };
  }
  if (await odoo.hasOdooSession()) {
    return odoo.getAuthMe();
  }
  return { authenticated: false, user: null };
}

const noAccess: BusinessStatusResponse = {
  state: null,
  canViewWholesalePrices: false,
};

export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  const odoo = await import("../odoo/auth");
  if (await odoo.getOdooStaffUser()) return null;
  if (!(await odoo.hasOdooSession())) return null;
  const customer = await odoo.getCurrentCustomer();
  return customer ? odoo.toCustomerProfile(customer) : null;
}

export async function getBusinessStatus(): Promise<BusinessStatusResponse> {
  const odoo = await import("../odoo/auth");
  if (await odoo.getOdooStaffUser()) {
    return noAccess;
  }
  if (!(await odoo.hasOdooSession())) return noAccess;
  const customer = await odoo.getCurrentCustomer();
  if (!customer) return noAccess;
  const canViewWholesalePrices = customer.role === "merchant" && customer.tradeStatus === "approved";
  return {
    state: customer.tradeStatus,
    // UI capability only. Odoo remains the price authority.
    canViewWholesalePrices,
  };
}
