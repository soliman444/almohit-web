import { odooRequest } from "./client";
import { mapTradeApplication, type OdooTradeApplicationPayload, type TradeApplication } from "./trade";
import type { OdooCookieAdapter, OdooPaginatedList } from "./types";

export type CreateMarketerMerchantInput = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  taxNumber: string;
  businessType?: string;
  phone?: string;
  street: string;
  city: string;
  managerName: string;
  employeeName?: string;
  bankAccount: string;
  paymentMethod: "bank_transfer" | "cash" | "both";
  shopImageBase64?: string;
  shopImageContentType?: string;
  notes?: string;
};

export function marketerMerchantBody(input: CreateMarketerMerchantInput) {
  return {
    name: input.name,
    email: input.email,
    password: input.password,
    company_name: input.companyName,
    tax_number: input.taxNumber,
    street: input.street,
    city: input.city,
    manager_name: input.managerName,
    bank_account: input.bankAccount,
    payment_method: input.paymentMethod,
    ...(input.businessType ? { business_type: input.businessType } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.employeeName ? { employee_name: input.employeeName } : {}),
    ...(input.shopImageBase64 ? { shop_image_base64: input.shopImageBase64 } : {}),
    ...(input.shopImageContentType ? { shop_image_content_type: input.shopImageContentType } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

export async function listMarketerMerchants(cookies?: OdooCookieAdapter): Promise<TradeApplication[]> {
  const payload = await odooRequest<OdooPaginatedList<OdooTradeApplicationPayload>>("/marketer/merchants", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return (payload?.items ?? []).map(mapTradeApplication);
}

export async function createMarketerMerchant(
  input: CreateMarketerMerchantInput,
  cookies?: OdooCookieAdapter,
): Promise<TradeApplication> {
  const payload = await odooRequest<OdooTradeApplicationPayload>("/marketer/merchants", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: marketerMerchantBody(input),
  });
  return mapTradeApplication(payload);
}
