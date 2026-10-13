import { ODOO_SESSION_COOKIE_NAME } from "./config";
import type { OdooCookieAdapter, OdooCookieSetOptions } from "./types";

export type ParsedOdooSessionCookie = {
  value: string;
  maxAge?: number;
  expires?: Date;
};

export function memoryCookieAdapter(initial: Record<string, string> = {}): OdooCookieAdapter & { jar: Map<string, string> } {
  const jar = new Map(Object.entries(initial));
  return {
    jar,
    get(name) {
      return jar.get(name);
    },
    set(name, value) {
      if (!value) {
        jar.delete(name);
        return;
      }
      jar.set(name, value);
    },
    delete(name) {
      jar.delete(name);
    },
  };
}

export async function nextOdooCookies(): Promise<OdooCookieAdapter> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return {
    get(name) {
      return store.get(name)?.value;
    },
    set(name, value, options) {
      store.set({
        name,
        value,
        httpOnly: options?.httpOnly ?? true,
        secure: options?.secure ?? process.env.NODE_ENV === "production",
        sameSite: options?.sameSite ?? "lax",
        path: options?.path ?? "/",
        ...(options?.maxAge != null ? { maxAge: options.maxAge } : {}),
        ...(options?.expires ? { expires: options.expires } : {}),
      });
    },
    delete(name) {
      store.delete(name);
    },
  };
}

export function readOdooSessionCookie(adapter: OdooCookieAdapter): string | undefined {
  const value = adapter.get(ODOO_SESSION_COOKIE_NAME)?.trim();
  return value || undefined;
}

export function odooSessionCookieOptions(parsed?: ParsedOdooSessionCookie): OdooCookieSetOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(parsed?.maxAge != null ? { maxAge: parsed.maxAge } : {}),
    ...(parsed?.expires ? { expires: parsed.expires } : {}),
  };
}

export function extractOdooSessionFromSetCookie(headers: readonly string[]): ParsedOdooSessionCookie | null {
  for (const header of headers) {
    const parsed = parseSetCookiePair(header, ODOO_SESSION_COOKIE_NAME);
    if (parsed) return parsed;
  }
  return null;
}

function parseSetCookiePair(header: string, expectedName: string): ParsedOdooSessionCookie | null {
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [nameValue, ...attrs] = parts;
  const eq = nameValue.indexOf("=");
  if (eq < 0) return null;

  const name = nameValue.slice(0, eq).trim();
  if (name !== expectedName) return null;

  const value = nameValue.slice(eq + 1).trim().replace(/^"|"$/g, "");
  const result: ParsedOdooSessionCookie = { value };
  let expired = !value;

  for (const attr of attrs) {
    const attrEq = attr.indexOf("=");
    const attrName = (attrEq < 0 ? attr : attr.slice(0, attrEq)).trim().toLowerCase();
    const attrValue = attrEq < 0 ? "" : attr.slice(attrEq + 1).trim();

    if (attrName === "max-age") {
      const maxAge = Number(attrValue);
      if (Number.isFinite(maxAge)) {
        result.maxAge = maxAge;
        if (maxAge <= 0) expired = true;
      }
    }

    if (attrName === "expires") {
      const expires = new Date(attrValue);
      if (!Number.isNaN(expires.getTime())) {
        result.expires = expires;
        if (expires.getTime() <= Date.now()) expired = true;
      }
    }
  }

  if (expired) {
    return { value: "", maxAge: 0 };
  }

  return result;
}

export function applyOdooSetCookie(response: Response, adapter: OdooCookieAdapter) {
  const headers = readSetCookieHeaders(response);
  const parsed = extractOdooSessionFromSetCookie(headers);
  if (!parsed) return;

  try {
    if (!parsed.value) {
      adapter.delete(ODOO_SESSION_COOKIE_NAME);
      return;
    }
    adapter.set(ODOO_SESSION_COOKIE_NAME, parsed.value, odooSessionCookieOptions(parsed));
  } catch {
    // Server Components cannot write cookies; login/logout run in Server Actions.
  }
}

function readSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) return cookies;
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

export function clearOdooSessionCookie(adapter: OdooCookieAdapter) {
  try {
    adapter.delete(ODOO_SESSION_COOKIE_NAME);
  } catch {
    // ignore read-only cookie contexts
  }
}
