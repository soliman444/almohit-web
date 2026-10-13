export class OdooUnavailableError extends Error {
    readonly code = "ODOO_UNAVAILABLE";
  
    constructor(cause?: unknown) {
      super("Odoo service is unavailable", { cause });
      this.name = "OdooUnavailableError";
    }
  }
  
  export class OdooAuthenticationError extends Error {
    readonly code = "ODOO_AUTH_FAILED";
  
    constructor() {
      super("Odoo authentication failed");
      this.name = "OdooAuthenticationError";
    }
  }
  
  export class OdooPermissionError extends Error {
    readonly code = "ODOO_PERMISSION_DENIED";
  
    constructor(message = "Odoo permission denied") {
      super(message);
      this.name = "OdooPermissionError";
    }
  }
  
  export class OdooRpcError extends Error {
    readonly code = "ODOO_RPC_ERROR";
  
    constructor(message = "Odoo RPC error", cause?: unknown) {
      super(message, { cause });
      this.name = "OdooRpcError";
    }
  }