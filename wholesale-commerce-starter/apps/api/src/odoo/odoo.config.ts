export type OdooConfig = {
    url: string;
    database: string;
    username: string;
    apiKey: string;
  };
  
  export function getOdooConfig(): OdooConfig {
    const url = process.env.ODOO_URL?.trim();
    const database = process.env.ODOO_DB?.trim();
    const username = process.env.ODOO_USERNAME?.trim();
    const apiKey = process.env.ODOO_API_KEY?.trim();
  
    if (!url) {
      throw new Error("ODOO_URL is required");
    }
  
    if (!database) {
      throw new Error("ODOO_DB is required");
    }
  
    if (!username) {
      throw new Error("ODOO_USERNAME is required");
    }
  
    if (!apiKey) {
      throw new Error("ODOO_API_KEY is required");
    }
  
    return {
      url: url.replace(/\/+$/, ""),
      database,
      username,
      apiKey,
    };
  }