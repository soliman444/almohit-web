import { ApiClientError } from "../api/client";
import { odooRequest } from "./client";
import { mapAppRole, type OdooAppRole, type OdooCookieAdapter } from "./types";

export type TradeApplicationStatus = "pending" | "approved" | "rejected";

export type TradeApplication = {
  id: string;
  status: TradeApplicationStatus;
  role: OdooAppRole;
  companyName: string;
  taxNumber: string | null;
  businessType: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  managerName: string | null;
  employeeName: string | null;
  bankAccount: string | null;
  paymentMethod: "bank_transfer" | "cash" | "both" | null;
  shopImageUrl: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  recruitedBy: { partnerId: string; name: string } | null;
  merchantEmail: string | null;
};

export type OdooTradeApplicationPayload = {
  id: number;
  status: string;
  role?: string | null;
  company_name: string;
  tax_number?: string | null;
  business_type?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  manager_name?: string | null;
  employee_name?: string | null;
  bank_account?: string | null;
  payment_method?: string | null;
  shop_image_url?: string | null;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  recruited_by?: { partner_id: number; name: string } | null;
  merchant_email?: string | null;
};

export type SubmitTradeApplicationInput = {
  companyName: string;
  role?: OdooAppRole;
  taxNumber?: string;
  businessType?: string;
  phone?: string;
  street?: string;
  city?: string;
  managerName?: string;
  employeeName?: string;
  bankAccount?: string;
  paymentMethod?: "bank_transfer" | "cash" | "both";
  shopImageBase64?: string;
  shopImageContentType?: string;
  notes?: string;
};

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

export function mapTradeApplication(payload: OdooTradeApplicationPayload): TradeApplication {
  return {
    id: String(payload.id),
    status: mapTradeApplicationStatus(payload.status),
    role: mapAppRole(payload.role),
    companyName: payload.company_name,
    taxNumber: payload.tax_number ?? null,
    businessType: payload.business_type ?? null,
    phone: payload.phone ?? null,
    street: payload.street ?? null,
    city: payload.city ?? null,
    managerName: payload.manager_name ?? null,
    employeeName: payload.employee_name ?? null,
    bankAccount: payload.bank_account ?? null,
    paymentMethod: mapPaymentMethod(payload.payment_method),
    shopImageUrl: payload.shop_image_url ?? null,
    notes: payload.notes ?? null,
    rejectionReason: payload.rejection_reason ?? null,
    createdAt: payload.created_at ? String(payload.created_at) : null,
    recruitedBy: payload.recruited_by
      ? { partnerId: String(payload.recruited_by.partner_id), name: payload.recruited_by.name }
      : null,
    merchantEmail: payload.merchant_email ?? null,
  };
}

export function odooTradeApplicationBody(input: SubmitTradeApplicationInput) {
  return {
    company_name: input.companyName,
    ...(input.role ? { role: input.role } : {}),
    ...(input.taxNumber ? { tax_number: input.taxNumber } : {}),
    ...(input.businessType ? { business_type: input.businessType } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.street ? { street: input.street } : {}),
    ...(input.city ? { city: input.city } : {}),
    ...(input.managerName ? { manager_name: input.managerName } : {}),
    ...(input.employeeName ? { employee_name: input.employeeName } : {}),
    ...(input.bankAccount ? { bank_account: input.bankAccount } : {}),
    ...(input.paymentMethod ? { payment_method: input.paymentMethod } : {}),
    ...(input.shopImageBase64 ? { shop_image_base64: input.shopImageBase64 } : {}),
    ...(input.shopImageContentType ? { shop_image_content_type: input.shopImageContentType } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

export async function getTradeApplication(
  cookies?: OdooCookieAdapter,
): Promise<TradeApplication | null> {
  try {
    const payload = await odooRequest<OdooTradeApplicationPayload | null>("/trade/application", {
      method: "GET",
      cookies,
      captureSetCookie: false,
    });
    return payload ? mapTradeApplication(payload) : null;
  } catch (error) {
    if (isUnauthenticated(error)) return null;
    throw error;
  }
}

export async function submitTradeApplication(
  input: SubmitTradeApplicationInput,
  cookies?: OdooCookieAdapter,
): Promise<TradeApplication> {
  const payload = await odooRequest<OdooTradeApplicationPayload>("/trade/applications", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: odooTradeApplicationBody(input),
  });
  return mapTradeApplication(payload);
}

function mapPaymentMethod(value: string | null | undefined): TradeApplication["paymentMethod"] {
  if (value === "bank_transfer" || value === "cash" || value === "both") return value;
  return null;
}

function mapTradeApplicationStatus(value: string): TradeApplicationStatus {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "approved" || status === "rejected" || status === "pending") return status;
  return "pending";
}

function isUnauthenticated(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return UNOAUTH_STATUSES.has(error.status) || error.code === "UNAUTHENTICATED";
}
