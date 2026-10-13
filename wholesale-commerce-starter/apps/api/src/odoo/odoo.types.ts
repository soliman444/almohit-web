export type OdooVersionInfo = {
    server_version: string;
    server_version_info: unknown[];
    server_serie: string;
    protocol_version: number;
  };
  
  export type OdooPermissionSummary = {
    partners: {
      read: boolean;
      create: boolean;
    };
    invoices: {
      read: boolean;
      create: boolean;
    };
  };
  
  export type OdooHealthResult = {
    status: "ok" | "degraded";
    version: string;
    authenticated: true;
    permissions: OdooPermissionSummary;
  };

  export type OdooPartner = {
    id: number;
    name: string;
    ref: string | false;
    email: string | false;
    phone: string | false;
    vat: string | false;
    company_type: "company" | "person";
  };
  
  export type CreateOdooPartnerInput = {
    name: string;
    ref: string;
    email?: string | null;
    phone?: string | null;
    vat?: string | null;
  };

  export type OdooPartnerInput = {
    name: string;
    ref: string;
    email: string | null;
    phone: string | null;
    vat: string | null;
  };