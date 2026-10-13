import { Injectable, Inject,} from "@nestjs/common";
import { OdooClient } from "./odoo.client";
import type {
  OdooHealthResult,
  OdooPermissionSummary,
  OdooPartner,
  OdooPartnerInput,
} from "./odoo.types";

@Injectable()
export class OdooService {
  constructor(
    @Inject(OdooClient)
    private readonly client: OdooClient) {}

    private partnerValues(
      input: OdooPartnerInput,
    ): Record<string, unknown> {
      return {
        name: input.name,
        ref: input.ref,
        company_type: "company",
    
        email: input.email ?? false,
        phone: input.phone ?? false,
        vat: input.vat ?? false,
      };
    }
  async health(): Promise<OdooHealthResult> {
    const version = await this.client.version();

    await this.client.authenticate();

    const permissions = await this.checkPermissions();

    const allRequired =
      permissions.partners.read &&
      permissions.partners.create &&
      permissions.invoices.read &&
      permissions.invoices.create;

    return {
      status: allRequired ? "ok" : "degraded",
      version: version.server_version,
      authenticated: true,
      permissions,
    };
  }
  async findPartnerByRef(
    ref: string,
  ): Promise<OdooPartner | null> {
    const partners =
      await this.client.executeKw<OdooPartner[]>(
        "res.partner",
        "search_read",
        [
          [
            ["ref", "=", ref],
          ],
        ],
        {
          fields: [
            "id",
            "name",
            "ref",
            "email",
            "phone",
            "vat",
            "company_type",
          ],
          limit: 1,
        },
      );
  
    return partners[0] ?? null;
  }

  async findPartnerById(
    partnerId: number,
  ): Promise<OdooPartner | null> {
    const partners =
      await this.client.executeKw<OdooPartner[]>(
        "res.partner",
        "search_read",
        [
          [
            ["id", "=", partnerId],
          ],
        ],
        {
          fields: [
            "id",
            "name",
            "ref",
            "email",
            "phone",
            "vat",
            "company_type",
          ],
          limit: 1,
        },
      );
  
    return partners[0] ?? null;
  }
  
  async createPartner(
    input: OdooPartnerInput,
  ): Promise<number> {
    return this.client.executeKw<number>(
      "res.partner",
      "create",
      [
        this.partnerValues(input),
      ],
    );
  }

  async updatePartner(
    partnerId: number,
    input: OdooPartnerInput,
  ): Promise<void> {
    const updated =
      await this.client.executeKw<boolean>(
        "res.partner",
        "write",
        [
          [partnerId],
          this.partnerValues(input),
        ],
      );
  
    if (!updated) {
      throw new Error(
        `Failed to update Odoo partner ${partnerId}`,
      );
    }
  }

  async checkPermissions(): Promise<OdooPermissionSummary> {
    const [
      partnersRead,
      partnersCreate,
      invoicesRead,
      invoicesCreate,
    ] = await Promise.all([
      this.checkAccess("res.partner", "read"),
      this.checkAccess("res.partner", "create"),
      this.checkAccess("account.move", "read"),
      this.checkAccess("account.move", "create"),
    ]);

    return {
      partners: {
        read: partnersRead,
        create: partnersCreate,
      },
      invoices: {
        read: invoicesRead,
        create: invoicesCreate,
      },
    };
  }

  private async checkAccess(
    model: string,
    operation: "read" | "create",
  ): Promise<boolean> {
    return this.client.executeKw<boolean>(
      model,
      "check_access_rights",
      [operation],
      {
        raise_exception: false,
      },
    );
  }
}