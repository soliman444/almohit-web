import type { AuthMeResponse, CustomerProfile } from "@almohit/contracts";
import { ApiClientError } from "../api/client";
import { odooRequest } from "./client";
import { ODOO_SESSION_COOKIE_NAME } from "./config";
import { clearOdooSessionCookie, nextOdooCookies, readOdooSessionCookie } from "./cookies";
import {
  mapCurrentCustomer,
  type CurrentCustomer,
  type OdooAuthUserPayload,
  type OdooCookieAdapter,
  type OdooHealth,
} from "./types";

export type { CurrentCustomer, OdooApiError, OdooApiSuccess, OdooHealth, OdooTradeStatus, PaymentTerm } from "./types";

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

export async function getOdooHealth(cookies?: OdooCookieAdapter): Promise<OdooHealth> {
  return odooRequest<OdooHealth>("/health", { method: "GET", cookies, captureSetCookie: false });
}

export async function hasOdooSession(cookies?: OdooCookieAdapter): Promise<boolean> {
  const adapter = cookies ?? await nextOdooCookies();
  return Boolean(readOdooSessionCookie(adapter));
}

export async function registerCustomer(
  input: { name: string; email: string; password: string; phone?: string; role?: "merchant" | "buyer" | "distributor" | "marketer" },
  cookies?: OdooCookieAdapter,
): Promise<CurrentCustomer> {
  const payload = await odooRequest<OdooAuthUserPayload>("/auth/register", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.role ? { role: input.role } : {}),
    },
  });
  return mapCurrentCustomer(payload);
}

export async function loginCustomer(
  input: { email: string; password: string },
  cookies?: OdooCookieAdapter,
): Promise<CurrentCustomer> {
  const adapter = cookies ?? await nextOdooCookies();
  const payload = await odooRequest<OdooAuthUserPayload>("/auth/login", {
    method: "POST",
    cookies: adapter,
    captureSetCookie: true,
    body: {
      email: input.email,
      password: input.password,
    },
  });
  return mapCurrentCustomer(payload);
}

export async function getSessionUser(cookies?: OdooCookieAdapter): Promise<CurrentCustomer | null> {
  const adapter = cookies ?? await nextOdooCookies();
  if (!readOdooSessionCookie(adapter)) return null;

  try {
    const payload = await odooRequest<OdooAuthUserPayload>("/auth/me", {
      method: "GET",
      cookies: adapter,
      captureSetCookie: false,
    });
    return mapCurrentCustomer(payload);
  } catch (error) {
    if (isUnauthenticated(error)) return null;
    throw error;
  }
}

export async function getCurrentCustomer(cookies?: OdooCookieAdapter): Promise<CurrentCustomer | null> {
  const session = await getSessionUser(cookies);
  if (!session || session.isStaff) return null;
  return session;
}

export async function getOdooStaffUser(cookies?: OdooCookieAdapter): Promise<CurrentCustomer | null> {
  const session = await getSessionUser(cookies);
  if (!session?.isStaff) return null;
  return session;
}

export async function getAuthMe(cookies?: OdooCookieAdapter): Promise<AuthMeResponse> {
  const customer = await getCurrentCustomer(cookies);
  if (!customer) return { authenticated: false, user: null };
  return toAuthMeResponse(customer);
}

export async function logoutCurrentCustomer(cookies?: OdooCookieAdapter): Promise<void> {
  const adapter = cookies ?? await nextOdooCookies();
  const session = readOdooSessionCookie(adapter);

  try {
    if (session) {
      await odooRequest<{ logged_out: boolean }>("/auth/logout", {
        method: "POST",
        cookies: adapter,
        captureSetCookie: true,
      });
    }
  } catch {
    // Remote logout is best-effort. The Next.js copy of session_id is always cleared.
  } finally {
    clearOdooSessionCookie(adapter);
  }
}

export function toAuthMeResponse(customer: CurrentCustomer): AuthMeResponse {
  return {
    authenticated: true,
    user: {
      id: String(customer.userId),
      email: customer.email,
      name: customer.name,
    },
    roles: [],
    permissions: [],
    isSuperAdmin: false,
  };
}

export function toCustomerProfile(customer: CurrentCustomer): CustomerProfile {
  return {
    id: String(customer.partnerId),
    state: customer.tradeStatus.toUpperCase() as CustomerProfile["state"],
    companyName: null,
    businessName: customer.name,
    phone: customer.phone,
    priceAccess: customer.tradeStatus === "approved",
    priceGroupName: customer.priceGroupName,
    role: customer.role,
  };
}

export function isOdooAuthError(error: unknown, code: string): boolean {
  return error instanceof ApiClientError && error.code === code;
}

function isUnauthenticated(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return UNOAUTH_STATUSES.has(error.status) || error.code === "UNAUTHENTICATED";
}

export function odooSessionCookieName() {
  return ODOO_SESSION_COOKIE_NAME;
}
