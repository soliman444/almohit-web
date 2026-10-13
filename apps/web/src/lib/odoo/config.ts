export const ODOO_SESSION_COOKIE_NAME = process.env.ODOO_SESSION_COOKIE_NAME ?? "session_id";

export function getOdooApiUrl(): string {
  const url = (process.env.ODOO_API_URL ?? "http://localhost:8070").trim();
  return url.replace(/\/+$/, "");
}

export function getOdooApiPrefix(): string {
  return "/almohit/api";
}

export function getOdooDb(): string {
  return (process.env.ODOO_DB ?? "").trim();
}

export function getOdooStaffLogin(): string {
  return (process.env.ODOO_STAFF_LOGIN ?? "").trim();
}

export function getOdooStaffPassword(): string {
  return (process.env.ODOO_STAFF_PASSWORD ?? "").trim();
}
