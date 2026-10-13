import { getOdooApiUrl } from "./config";
import { mapOdooOrder, mapOdooOrderSummary, type OdooOrderPayload, type StorefrontOrderDetail } from "./orders";
import { odooStaffRequest, staffCredentialsConfigured } from "./staff";

export type OdooAdminOrderCustomer = {
  partner_id: number;
  name: string;
  email?: string | null;
};

export type OdooAdminOrderPayload = OdooOrderPayload & {
  customer?: OdooAdminOrderCustomer | null;
  item_count?: number;
  note?: string | null;
};

export type AdminStorefrontOrder = ReturnType<typeof mapOdooOrderSummary> & {
  customerName: string;
  customerEmail: string | null;
  paymentStatus: string;
};

export type AdminStorefrontOrderDetail = StorefrontOrderDetail & {
  customerName: string;
  customerEmail: string | null;
  note: string | null;
};

export type OdooAdminOrderSummary = {
  total: number;
};

const ORDER_STATES = new Set(["sale", "done", "cancel", "sent"]);
const PAYMENT_STATES = new Set(["paid", "partial", "not_paid", "reversed"]);

export function mapAdminOrder(payload: OdooAdminOrderPayload): AdminStorefrontOrder {
  const summary = mapOdooOrderSummary(payload);
  return {
    ...summary,
    customerName: payload.customer?.name || "",
    customerEmail: payload.customer?.email ?? null,
    paymentStatus: payload.payment?.state ?? "not_paid",
  };
}

export function mapAdminOrderDetail(payload: OdooAdminOrderPayload): AdminStorefrontOrderDetail {
  return {
    ...mapOdooOrder(payload),
    customerName: payload.customer?.name || "",
    customerEmail: payload.customer?.email ?? null,
    note: payload.note ?? null,
  };
}

export async function listOdooAdminOrders(input: {
  q?: string;
  state?: string;
  payment?: string;
} = {}): Promise<AdminStorefrontOrder[]> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  const state = input.state?.trim().toLowerCase();
  if (state && ORDER_STATES.has(state)) query.set("state", state);
  const payment = input.payment?.trim().toLowerCase();
  if (payment && PAYMENT_STATES.has(payment)) query.set("payment", payment);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await odooStaffRequest<OdooAdminOrderPayload[]>(`/admin/orders${suffix}`, {
    method: "GET",
  });
  return payload.map(mapAdminOrder);
}

export async function getOdooAdminOrder(orderId: number): Promise<AdminStorefrontOrderDetail> {
  const payload = await odooStaffRequest<OdooAdminOrderPayload>(`/admin/orders/${orderId}`, {
    method: "GET",
  });
  return mapAdminOrderDetail(payload);
}

export async function getOdooAdminOrderSummary(): Promise<OdooAdminOrderSummary> {
  return odooStaffRequest<OdooAdminOrderSummary>("/admin/orders/summary", { method: "GET" });
}

export async function countOdooAdminOrders(): Promise<number> {
  const summary = await getOdooAdminOrderSummary();
  return summary.total;
}

export function odooBackendOrderUrl(orderId: number) {
  return `${getOdooApiUrl()}/web#id=${orderId}&model=sale.order&view_type=form`;
}

export { staffCredentialsConfigured };
