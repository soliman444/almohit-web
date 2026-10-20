export const ODOO_SESSION_COOKIE_NAME = process.env.ODOO_SESSION_COOKIE_NAME ?? "session_id";

export function getOdooApiUrl(): string {
  const url = (process.env.ODOO_API_URL ?? "http://localhost:8070").trim();
  return url.replace(/\/+$/, "");
}

export function getOdooApiPrefix(): string {
  return "/almohit/api";
}
