import { SESSION_COOKIE_NAME } from "@almohit/config";

const API_BASE = process.env.ALMOHIT_API_URL ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get statusCode() {
    return this.status;
  }
}

export class ApiUnavailableError extends Error {
  readonly code = "API_UNAVAILABLE";

  constructor(cause?: unknown) {
    super("API_UNAVAILABLE", { cause });
    this.name = "ApiUnavailableError";
  }
}

async function sessionCookieHeader() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const name = process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME;
  const token = jar.get(name)?.value;
  return token ? `${name}=${token}` : undefined;
}

export async function hasApiSessionCookie() {
  return Boolean(await sessionCookieHeader());
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = await sessionCookieHeader();
  const headers = new Headers(init.headers);
  if (cookie && !headers.has("cookie")) headers.set("cookie", cookie);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: init.cache ?? "no-store",
      credentials: init.credentials ?? "include",
    });
  } catch (error) {
    console.error("Almohit API unavailable:", error);
    throw new ApiUnavailableError(error);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    throw new ApiClientError(
      response.status,
      typeof data.code === "string" ? data.code : "API_ERROR",
      typeof data.message === "string" ? data.message : "API request failed",
    );
  }

  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
