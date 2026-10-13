import { ApiClientError, ApiUnavailableError } from "../api/client";
import { odooRequest } from "./client";
import {
  getOdooApiUrl,
  getOdooDb,
  getOdooStaffLogin,
  getOdooStaffPassword,
  ODOO_SESSION_COOKIE_NAME,
} from "./config";
import { extractOdooSessionFromSetCookie, memoryCookieAdapter } from "./cookies";
import type { OdooCookieAdapter } from "./types";

type StaffSession = {
  sessionId: string;
};

let cached: StaffSession | null = null;

function staffSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().filter(Boolean);
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

export function staffCredentialsConfigured() {
  return Boolean(getOdooStaffLogin() && getOdooStaffPassword() && getOdooDb());
}

export function clearOdooStaffSession() {
  cached = null;
}

async function authenticateStaff(): Promise<StaffSession> {
  if (!staffCredentialsConfigured()) {
    throw new ApiClientError(503, "STAFF_REQUIRED", "Odoo staff credentials are not configured.");
  }
  const url = `${getOdooApiUrl()}/web/session/authenticate`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          db: getOdooDb(),
          login: getOdooStaffLogin(),
          password: getOdooStaffPassword(),
        },
      }),
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
    });
  } catch (error) {
    throw new ApiUnavailableError(error);
  }

  const parsed = await response.json().catch(() => null) as {
    result?: { uid?: number; session_id?: string } | false;
    error?: unknown;
  } | null;
  const result = parsed && typeof parsed.result === "object" ? parsed.result : null;
  if (!result?.uid) {
    throw new ApiClientError(401, "UNAUTHENTICATED", "Odoo staff authentication failed.");
  }

  const setCookie = staffSetCookieHeaders(response);
  const session = extractOdooSessionFromSetCookie(setCookie);
  const sessionId = session?.value || result.session_id;
  if (!sessionId) {
    throw new ApiClientError(401, "UNAUTHENTICATED", "Odoo staff session cookie was not returned.");
  }
  cached = { sessionId };
  return cached;
}

export async function odooStaffCookies(): Promise<OdooCookieAdapter> {
  const session = cached ?? await authenticateStaff();
  return memoryCookieAdapter({ [ODOO_SESSION_COOKIE_NAME]: session.sessionId });
}

export async function odooStaffRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const cookies = await odooStaffCookies();
  try {
    return await odooRequest<T>(path, {
      method: options.method,
      body: options.body,
      cookies,
      captureSetCookie: false,
    });
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 401 || error.code === "UNAUTHENTICATED")) {
      clearOdooStaffSession();
      const retryCookies = await odooStaffCookies();
      return odooRequest<T>(path, {
        method: options.method,
        body: options.body,
        cookies: retryCookies,
        captureSetCookie: false,
      });
    }
    throw error;
  }
}
