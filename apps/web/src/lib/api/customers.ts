import type { BusinessStatusResponse, CustomerProfile } from "@almohit/contracts";

const noAccess: BusinessStatusResponse = {
  state: null,
  canViewWholesalePrices: false,
  hasActivePriceGroup: false,
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
  const approved = customer.tradeStatus === "approved";
  const canOrder = approved && customer.role !== "marketer";
  return {
    state: customer.tradeStatus.toUpperCase() as BusinessStatusResponse["state"],
    canViewWholesalePrices: canOrder,
    hasActivePriceGroup: canOrder,
  };
}
