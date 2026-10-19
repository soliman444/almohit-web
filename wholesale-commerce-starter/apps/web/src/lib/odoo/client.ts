import { setDefaultResultOrder } from "node:dns";
import { ApiClientError, ApiUnavailableError } from "../api/client";
import { getOdooApiPrefix, getOdooApiUrl, ODOO_SESSION_COOKIE_NAME } from "./config";
import {
  applyOdooSetCookie,
  nextOdooCookies,
  readOdooSessionCookie,
} from "./cookies";
import type { OdooApiResponse, OdooCookieAdapter } from "./types";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Node may already lock the resolver order.
}

export type OdooRequestOptions = {
  method?: string;
  body?: unknown;
  cookies?: OdooCookieAdapter;
  captureSetCookie?: boolean;
  headers?: HeadersInit;
};

const UNAVAILABLE_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524]);
const GET_NETWORK_RETRIES = 1;
const GET_RETRY_DELAYS_MS = [300];
const FETCH_TIMEOUT_MS = 12_000;

export async function odooRequest<T>(path: string, options: OdooRequestOptions = {}): Promise<T> {
  const adapter = options.cookies ?? await nextOdooCookies();
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
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

  const attempts = method === "GET" && options.body === undefined ? GET_NETWORK_RETRIES + 1 : 1;
  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const retry = attempt < attempts - 1 && isRetryableNetworkError(error);
      if (!retry) {
        console.error("Odoo API unavailable:", error);
        throw new ApiUnavailableError(error);
      }
      await wait(GET_RETRY_DELAYS_MS[attempt] ?? 700);
    }
  }

  if (!response) {
    console.error("Odoo API unavailable:", lastError);
    throw new ApiUnavailableError(lastError);
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
    if (UNAVAILABLE_STATUSES.has(response.status) || response.status >= 500) {
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return true;
  }
  const codes = collectErrorCodes(error);
  return codes.some((code) => (
    code === "ETIMEDOUT"
    || code === "ECONNRESET"
    || code === "ECONNREFUSED"
    || code === "ENOTFOUND"
    || code === "EAI_AGAIN"
    || code === "ABORT_ERR"
    || code === "UND_ERR_CONNECT_TIMEOUT"
    || code === "UND_ERR_SOCKET"
    || code === "UND_ERR_ABORTED"
  ));
}

function collectErrorCodes(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || typeof error !== "object" || seen.has(error)) return [];
  seen.add(error);
  const record = error as { code?: unknown; cause?: unknown; errors?: unknown[] };
  const codes: string[] = typeof record.code === "string" ? [record.code] : [];
  if (record.cause) codes.push(...collectErrorCodes(record.cause, seen));
  if (Array.isArray(record.errors)) {
    for (const item of record.errors) codes.push(...collectErrorCodes(item, seen));
  }
  return codes;
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
