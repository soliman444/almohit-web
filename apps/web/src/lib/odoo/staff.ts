import { ApiClientError } from "../api/client";
import { odooRequest } from "./client";
import { nextOdooCookies, readOdooSessionCookie } from "./cookies";
import { getOdooStaffUser } from "./auth";

export async function odooStaffRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const cookies = await nextOdooCookies();
  if (!readOdooSessionCookie(cookies)) {
    throw new ApiClientError(401, "UNAUTHENTICATED", "Sign in with an Odoo staff account.");
  }
  const staff = await getOdooStaffUser(cookies);
  if (!staff) {
    throw new ApiClientError(403, "STAFF_REQUIRED", "Only Odoo internal users can manage this.");
  }
  return odooRequest<T>(path, {
    method: options.method,
    body: options.body,
    cookies,
    captureSetCookie: false,
  });
}
