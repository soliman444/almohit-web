export type OdooTradeStatus = "normal" | "pending" | "approved" | "rejected";
export type OdooAppRole = "merchant" | "buyer" | "distributor" | "marketer";

export type OdooApiErrorBody = {
  code: string;
  message: string;
  [key: string]: unknown;
};

export type OdooApiSuccess<T> = {
  ok: true;
  data: T;
};

export type OdooApiError = {
  ok: false;
  error: OdooApiErrorBody;
};

export type OdooApiResponse<T> = OdooApiSuccess<T> | OdooApiError;

export type OdooPaymentTermPayload = {
  id: number;
  name: string;
};

export type PaymentTerm = {
  id: string;
  name: string;
};

export type OdooPriceGroupPayload = {
  id: number;
  name: string;
};

export type OdooAuthUserPayload = {
  user_id: number;
  partner_id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  trade_status: string;
  role?: string | null;
  payment_term?: OdooPaymentTermPayload | null;
  price_group?: OdooPriceGroupPayload | null;
};

export type CurrentCustomer = {
  userId: number;
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  tradeStatus: OdooTradeStatus;
  role: OdooAppRole;
  paymentTerm: PaymentTerm | null;
  priceGroupName: string | null;
};

export type OdooHealth = {
  status: string;
  backend: string;
  version: string;
};

export type OdooCookieSetOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  expires?: Date;
};

export type OdooCookieAdapter = {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: OdooCookieSetOptions): void;
  delete(name: string): void;
};

export function isOdooTradeStatus(value: string): value is OdooTradeStatus {
  return value === "normal" || value === "pending" || value === "approved" || value === "rejected";
}

export function mapTradeStatus(value: string | null | undefined): OdooTradeStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (isOdooTradeStatus(normalized)) return normalized;
  return "normal";
}

export function isOdooAppRole(value: string): value is OdooAppRole {
  return value === "merchant" || value === "buyer" || value === "distributor";
}

export function mapAppRole(value: string | null | undefined): OdooAppRole {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (isOdooAppRole(normalized)) return normalized;
  return "merchant";
}

export function mapPaymentTerm(payload: OdooPaymentTermPayload | null | undefined): PaymentTerm | null {
  if (!payload || typeof payload.id !== "number" || !payload.name) return null;
  return {
    id: String(payload.id),
    name: payload.name,
  };
}

export function mapPriceGroupName(payload: OdooPriceGroupPayload | null | undefined): string | null {
  if (!payload || typeof payload.name !== "string") return null;
  const name = payload.name.trim();
  return name || null;
}

export function mapCurrentCustomer(payload: OdooAuthUserPayload): CurrentCustomer {
  return {
    userId: payload.user_id,
    partnerId: payload.partner_id,
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    tradeStatus: mapTradeStatus(payload.trade_status),
    role: mapAppRole(payload.role),
    paymentTerm: mapPaymentTerm(payload.payment_term),
    priceGroupName: mapPriceGroupName(payload.price_group),
  };
}
