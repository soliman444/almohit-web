import { ApiClientError, ApiUnavailableError } from "../api/client";
import { getOdooApiPrefix, getOdooApiUrl, ODOO_SESSION_COOKIE_NAME } from "./config";
import {
  applyOdooSetCookie,
  nextOdooCookies,
  readOdooSessionCookie,
} from "./cookies";
import type { OdooApiResponse, OdooCookieAdapter } from "./types";

export type OdooRequestOptions = {
  method?: string;
  body?: unknown;
  cookies?: OdooCookieAdapter;
  captureSetCookie?: boolean;
  headers?: HeadersInit;
};

const UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

export async function odooRequest<T>(path: string, options: OdooRequestOptions = {}): Promise<T> {
  const adapter = options.cookies ?? await nextOdooCookies();
  const url = `${getOdooApiUrl()}${getOdooApiPrefix()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");

  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const session = readOdooSessionCookie(adapter);
  if (session) {
    headers.set("cookie", `${ODOO_SESSION_COOKIE_NAME}=${session}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
    });
  } catch (error) {
    console.error("Odoo API unavailable:", error);
    throw new ApiUnavailableError(error);
  }

  if (response.status >= 300 && response.status < 400) {
    throw new ApiClientError(response.status, "UNAUTHENTICATED", "Odoo session is not authenticated.");
  }

  const parsed = await parseOdooBody(response);

  if (isOdooApiResponse(parsed)) {
    if (parsed.ok) {
      if (options.captureSetCookie) {
        applyOdooSetCookie(response, adapter);
      }
      return parsed.data as T;
    }
    const { code, message, ...details } = parsed.error;
    throw new ApiClientError(
      response.status,
      code || "API_ERROR",
      message || "Odoo request failed",
      details,
    );
  }

  if (!response.ok) {
    if (UNAVAILABLE_STATUSES.has(response.status)) {
      throw new ApiUnavailableError(new Error(`Odoo HTTP ${response.status}`));
    }
    throw new ApiClientError(response.status, "API_ERROR", "Odoo request failed");
  }

  return parsed as T;
}

async function parseOdooBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (UNAVAILABLE_STATUSES.has(response.status) || response.status >= 500) {
      throw new ApiUnavailableError(new Error(`Odoo returned non-JSON HTTP ${response.status}`));
    }
    throw new ApiClientError(response.status, "API_ERROR", "Odoo returned a non-JSON response");
  }
}

function isOdooApiResponse(value: unknown): value is OdooApiResponse<unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.ok === true) return true;
  if (record.ok === false && record.error && typeof record.error === "object") {
    const error = record.error as Record<string, unknown>;
    return typeof error.code === "string";
  }
  return false;
}
