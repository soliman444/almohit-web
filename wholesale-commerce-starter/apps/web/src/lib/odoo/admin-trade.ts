import { odooStaffRequest } from "./staff";
import {
  mapTradeApplication,
  type OdooTradeApplicationPayload,
  type TradeApplication,
  type TradeApplicationStatus,
} from "./trade";

export type OdooAdminTradeCustomer = {
  partner_id: number;
  name: string;
  email?: string | null;
};

export type OdooAdminTradeApplicationPayload = OdooTradeApplicationPayload & {
  customer?: OdooAdminTradeCustomer | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

export type AdminTradeApplication = TradeApplication & {
  customerName: string;
  customerEmail: string | null;
  reviewedBy: string | null;
  marketerName: string | null;
};

export function mapAdminTradeApplication(payload: OdooAdminTradeApplicationPayload): AdminTradeApplication {
  return {
    ...mapTradeApplication(payload),
    customerName: payload.customer?.name || payload.company_name,
    customerEmail: payload.customer?.email ?? null,
    reviewedBy: payload.reviewed_by ?? null,
    marketerName: payload.recruited_by?.name ?? null,
  };
}

export async function listOdooAdminTradeApplications(input: {
  q?: string;
  status?: string;
} = {}): Promise<AdminTradeApplication[]> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  const status = input.status?.trim().toLowerCase();
  if (status === "pending" || status === "approved" || status === "rejected") {
    query.set("status", status);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await odooStaffRequest<OdooAdminTradeApplicationPayload[]>(
    `/admin/trade/applications${suffix}`,
    { method: "GET" },
  );
  return payload.map(mapAdminTradeApplication);
}

export async function countOdooPendingTradeApplications(): Promise<number> {
  const pending = await listOdooAdminTradeApplications({ status: "pending" });
  return pending.length;
}

export async function approveOdooAdminTradeApplication(applicationId: string): Promise<AdminTradeApplication> {
  const payload = await odooStaffRequest<OdooAdminTradeApplicationPayload>(
    `/admin/trade/applications/${applicationId}/approve`,
    { method: "POST", body: {} },
  );
  return mapAdminTradeApplication(payload);
}

export async function rejectOdooAdminTradeApplication(
  applicationId: string,
  reason?: string,
): Promise<AdminTradeApplication> {
  const payload = await odooStaffRequest<OdooAdminTradeApplicationPayload>(
    `/admin/trade/applications/${applicationId}/reject`,
    { method: "POST", body: { reason: reason || "" } },
  );
  return mapAdminTradeApplication(payload);
}

export type { TradeApplicationStatus };
