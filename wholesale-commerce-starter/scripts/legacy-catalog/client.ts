export type MigrationClient = {
  ping(): Promise<{ template_count: number; mapped_xmlids: number; wholesale_pricelist_id: number | null }>;
  batch(phase: string, records: unknown[]): Promise<import("./types").OdooBatchResult>;
};

export function createMigrationClient(options: {
  baseUrl: string;
  token: string;
}): MigrationClient {
  const base = options.baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-Almohit-Migration-Token": options.token,
        ...(init.headers ?? {}),
      },
    });
    const body = await response.json() as { ok?: boolean; data?: T; error?: { code?: string; message?: string } };
    if (!body.ok) {
      throw new Error(body.error?.message || `Odoo migration ${response.status}`);
    }
    return body.data as T;
  }

  return {
    ping() {
      return request("/almohit/api/migration/catalog/ping", { method: "POST" });
    },
    batch(phase, records) {
      return request("/almohit/api/migration/catalog/batch", {
        method: "POST",
        body: JSON.stringify({ phase, records }),
      });
    },
  };
}
