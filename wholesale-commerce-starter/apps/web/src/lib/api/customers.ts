import type { BusinessStatusResponse, CustomerProfile } from "@almohit/contracts";
import { apiGet, ApiClientError, hasApiSessionCookie } from "./client";

const noAccess: BusinessStatusResponse = {
  state: null,
  canViewWholesalePrices: false,
  hasActivePriceGroup: false,
};

export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  const { getCurrentUser: getPrismaUser, isStaffUser } = await import("../auth");
  const staff = await getPrismaUser();
  if (staff && staff.status === "ACTIVE" && isStaffUser(staff)) {
    return null;
  }
  const odoo = await import("../odoo/auth");
  if (await odoo.hasOdooSession()) {
    const customer = await odoo.getCurrentCustomer();
    return customer ? odoo.toCustomerProfile(customer) : null;
  }
  if (!(await hasApiSessionCookie())) return null;

  try {
    const body = await apiGet<CustomerProfile | { customer: null }>("/customers/me");
    if (!body || !("id" in body)) return null;
    return body;
  } catch (error) {
    if (error instanceof ApiClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      return null;
    }
    throw error;
  }
}

export async function getBusinessStatus(): Promise<BusinessStatusResponse> {
  const { getCurrentUser: getPrismaUser, isStaffUser } = await import("../auth");
  const staff = await getPrismaUser();
  if (staff && staff.status === "ACTIVE" && isStaffUser(staff)) {
    return noAccess;
  }
  const odoo = await import("../odoo/auth");
  if (await odoo.hasOdooSession()) {
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
  if (!(await hasApiSessionCookie())) return noAccess;
  try {
    return await apiGet<BusinessStatusResponse>("/customers/me/business-status");
  } catch (error) {
    if (error instanceof ApiClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      return noAccess;
    }
    throw error;
  }
}
