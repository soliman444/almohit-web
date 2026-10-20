import { ApiClientError } from "./errors";
import { mapOdooAddress, type OdooAddressPayload, type StorefrontAddress } from "./addresses";
import { odooRequest } from "./client";
import type { OdooCookieAdapter, OdooPaginatedList } from "./types";

export const DELIVERY_STATUSES = ["pending", "waiting", "ready", "delivered", "cancelled"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export const DELIVERY_ACTIONS = ["ready", "delivered"] as const;
export type DeliveryAction = (typeof DELIVERY_ACTIONS)[number];

export type OdooDeliveryItemPayload = {
  id: number;
  product_id?: number | null;
  name: string;
  default_code?: string | null;
  quantity: number;
  quantity_done?: number | null;
  uom?: string | null;
};

export type OdooDeliveryPayload = {
  id: number;
  name: string;
  status?: string | null;
  scheduled_date?: string | null;
  date_done?: string | null;
  origin?: string | null;
  order?: { id: number; name: string } | null;
  customer?: { name?: string | null; phone?: string | null } | null;
  shipping_address?: OdooAddressPayload | null;
  items?: OdooDeliveryItemPayload[];
  allowed_actions?: string[];
};

export type StorefrontDeliveryItem = {
  id: string;
  productName: string;
  sku: string | null;
  quantity: number;
  quantityDone: number;
  uom: string | null;
};

export type StorefrontDelivery = {
  id: string;
  name: string;
  status: DeliveryStatus;
  scheduledDate: string | null;
  dateDone: string | null;
  origin: string | null;
  order: { id: string; name: string } | null;
  customerName: string | null;
  customerPhone: string | null;
  shipping: StorefrontAddress | null;
  items: StorefrontDeliveryItem[];
  allowedActions: DeliveryAction[];
};

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

export function mapDeliveryStatus(value: string | null | undefined): DeliveryStatus {
  if (value === "pending" || value === "waiting" || value === "ready" || value === "delivered" || value === "cancelled") {
    return value;
  }
  return "waiting";
}

export function mapOdooDelivery(payload: OdooDeliveryPayload): StorefrontDelivery {
  const shipping = payload.shipping_address ? mapOdooAddress(payload.shipping_address) : null;
  const actions = (payload.allowed_actions ?? []).filter((action): action is DeliveryAction => (
    action === "ready" || action === "delivered"
  ));
  return {
    id: String(payload.id),
    name: payload.name,
    status: mapDeliveryStatus(payload.status),
    scheduledDate: payload.scheduled_date ?? null,
    dateDone: payload.date_done ?? null,
    origin: payload.origin ?? null,
    order: payload.order ? { id: String(payload.order.id), name: payload.order.name } : null,
    customerName: payload.customer?.name ?? null,
    customerPhone: payload.customer?.phone ?? null,
    shipping,
    items: (payload.items ?? []).map((item) => ({
      id: String(item.id),
      productName: item.name,
      sku: item.default_code ?? null,
      quantity: item.quantity,
      quantityDone: item.quantity_done ?? 0,
      uom: item.uom ?? null,
    })),
    allowedActions: actions,
  };
}

export async function listOdooDeliveries(cookies?: OdooCookieAdapter): Promise<StorefrontDelivery[]> {
  try {
    const payload = await odooRequest<OdooPaginatedList<OdooDeliveryPayload>>("/deliveries", {
      method: "GET",
      cookies,
      captureSetCookie: false,
    });
    return (payload?.items ?? []).map(mapOdooDelivery);
  } catch (error) {
    if (isUnauthenticated(error)) return [];
    throw error;
  }
}

export async function getOdooDelivery(deliveryId: number, cookies?: OdooCookieAdapter): Promise<StorefrontDelivery> {
  const payload = await odooRequest<OdooDeliveryPayload>(`/deliveries/${deliveryId}`, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooDelivery(payload);
}

export async function updateOdooDeliveryStatus(
  deliveryId: number,
  status: DeliveryAction,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontDelivery> {
  const payload = await odooRequest<OdooDeliveryPayload>(`/deliveries/${deliveryId}/status`, {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: { status },
  });
  return mapOdooDelivery(payload);
}

function isUnauthenticated(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return UNOAUTH_STATUSES.has(error.status) || error.code === "UNAUTHENTICATED" || error.code === "DISTRIBUTOR_REQUIRED";
}
