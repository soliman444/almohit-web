import { getOdooApiUrl } from "./config";
import { odooStaffRequest } from "./staff";
import { mapPaymentTerm, type OdooPaymentTermPayload, type PaymentTerm } from "./types";

export type OdooAdminCustomerPayload = {
  id: number;
  user_id?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  trade_status?: string | null;
  role?: string | null;
  city?: string | null;
  price_group?: { id: number; name: string } | null;
  payment_term?: OdooPaymentTermPayload | null;
  created_at?: string | null;
  active?: boolean;
};

export type AdminStorefrontCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  role: string;
  tradeStatus: string;
  priceGroupName: string | null;
  paymentTerm: PaymentTerm | null;
  createdAt: string | null;
  active: boolean;
};

export type OdooAdminCustomerSummary = {
  total: number;
};

const TRADE_STATUSES = new Set(["normal", "pending", "approved", "rejected"]);
const APP_ROLES = new Set(["merchant", "buyer", "distributor", "marketer"]);

export function mapAdminCustomer(payload: OdooAdminCustomerPayload): AdminStorefrontCustomer {
  return {
    id: String(payload.id),
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    city: payload.city ?? null,
    role: payload.role || "merchant",
    tradeStatus: payload.trade_status || "normal",
    priceGroupName: payload.price_group?.name ?? null,
    paymentTerm: mapPaymentTerm(payload.payment_term),
    createdAt: payload.created_at ?? null,
    active: payload.active !== false,
  };
}

export async function listOdooAdminCustomers(input: {
  q?: string;
  status?: string;
  role?: string;
} = {}): Promise<AdminStorefrontCustomer[]> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  const status = input.status?.trim().toLowerCase();
  if (status && TRADE_STATUSES.has(status)) query.set("status", status);
  const role = input.role?.trim().toLowerCase();
  if (role && APP_ROLES.has(role)) query.set("role", role);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await odooStaffRequest<OdooAdminCustomerPayload[]>(`/admin/customers${suffix}`, {
    method: "GET",
  });
  return payload.map(mapAdminCustomer);
}

export async function countOdooAdminCustomers(): Promise<number> {
  const summary = await odooStaffRequest<OdooAdminCustomerSummary>("/admin/customers/summary", {
    method: "GET",
  });
  return summary.total;
}

export type OdooAdminStaff = {
  id: string;
  name: string;
  login: string;
  email: string;
  active: boolean;
  groups: string[];
};

export async function listOdooAdminStaff(input: { q?: string } = {}): Promise<OdooAdminStaff[]> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await odooStaffRequest<Array<{
    id: number;
    name: string;
    login: string;
    email?: string | null;
    active?: boolean;
    groups?: string[];
  }>>(`/admin/staff${suffix}`, { method: "GET" });
  return payload.map((user) => ({
    id: String(user.id),
    name: user.name,
    login: user.login,
    email: user.email || user.login,
    active: user.active !== false,
    groups: user.groups ?? [],
  }));
}

export async function countOdooAdminStaff(): Promise<number> {
  const summary = await odooStaffRequest<{ total: number }>("/admin/staff/summary", {
    method: "GET",
  });
  return summary.total;
}

export function odooBackendUserUrl(userId: number) {
  return `${getOdooApiUrl()}/web#id=${userId}&model=res.users&view_type=form`;
}

export function odooBackendUsersUrl() {
  return `${getOdooApiUrl()}/web#action=base.action_res_users&model=res.users`;
}

export function odooBackendGroupsUrl() {
  return `${getOdooApiUrl()}/web#action=base.action_res_groups&model=res.groups`;
}

export function odooBackendPartnerUrl(partnerId: number) {
  return `${getOdooApiUrl()}/web#id=${partnerId}&model=res.partner&view_type=form`;
}

