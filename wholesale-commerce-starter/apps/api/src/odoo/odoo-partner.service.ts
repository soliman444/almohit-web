import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
  } from "@nestjs/common";
  
  import { PrismaService } from "../common/prisma.service";
  import { OdooService } from "./odoo.service";
  import type { OdooPartnerInput } from "./odoo.types";
  import { hasPermission } from "../auth/auth-policy";
  import type { AuthContext } from "../auth/auth.types";

  @Injectable()
  export class OdooPartnerService {
    constructor(
      @Inject(PrismaService)
      private readonly prisma: PrismaService,
  
      @Inject(OdooService)
      private readonly odoo: OdooService,
    ) {}
    async syncCustomer(
        user: AuthContext | null,
        customerId: string,
      ) {
        this.requireSyncPermission(user);
      
        const partnerId =
          await this.ensureCustomerPartner(customerId);
      
        return {
          data: {
            customerId,
            odooPartnerId: partnerId,
            status: "SYNCED" as const,
          },
        };
      }
    async ensureCustomerPartner(
      customerId: string,
    ): Promise<number> {
      const customer =
        await this.loadCustomer(customerId);
  
      if (customer.businessStatus !== "APPROVED") {
        throw new ConflictException(
          "CUSTOMER_NOT_APPROVED",
        );
      }
  
      const ref =
        `ALMOHIT:CUSTOMER:${customer.id}`;
  
      const input: OdooPartnerInput = {
        name:
            customer.companyName?.trim() ||
            customer.businessName?.trim() ||
            customer.user.name?.trim() ||
            customer.user.email?.trim() ||
            customer.customerCode,
  
        ref,
  
        email:
          customer.user.email?.trim() || null,
  
        phone:
          customer.user.phone?.trim() || null,
  
        vat:
          customer.taxNumber?.trim() || null,
      };
  
      // Step 1:
      // لدينا بالفعل Odoo ID محفوظ محليًا.
      if (customer.odooPartnerId !== null) {
        const linked =
          await this.odoo.findPartnerById(
            customer.odooPartnerId,
          );
  
        if (linked) {
          if (linked.ref !== ref) {
            throw new ConflictException(
              "ODOO_PARTNER_LINK_CONFLICT",
            );
          }
  
          await this.odoo.updatePartner(
            linked.id,
            input,
          );
  
          return linked.id;
        }
      }
  
      // Step 2:
      // الرابط المحلي غير موجود أو Partner حُذف.
      // ابحث بالهوية الثابتة داخل Odoo.
      const existing =
        await this.odoo.findPartnerByRef(ref);
  
      if (existing) {
        await this.odoo.updatePartner(
          existing.id,
          input,
        );
  
        await this.savePartnerId(
          customer.id,
          existing.id,
        );
  
        return existing.id;
      }
  
      // Step 3:
      // لا يوجد Partner حتى الآن.
      const createdId =
        await this.odoo.createPartner(input);
  
      await this.savePartnerId(
        customer.id,
        createdId,
      );
  
      return createdId;
    }
  
    private async loadCustomer(
      customerId: string,
    ) {
      const customer =
        await this.prisma.client.customer.findUnique({
          where: {
            id: customerId,
          },
          select: {
            id: true,
            customerCode: true,
            businessStatus: true,
            companyName: true,
            businessName: true,
            taxNumber: true,
            odooPartnerId: true,
  
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        });
  
      if (!customer) {
        throw new NotFoundException(
          "CUSTOMER_NOT_FOUND",
        );
      }
  
      return customer;
    }
  
    private async savePartnerId(
      customerId: string,
      partnerId: number,
    ) {
      await this.prisma.client.customer.update({
        where: {
          id: customerId,
        },
        data: {
          odooPartnerId: partnerId,
        },
      });
    }

    private requireSyncPermission(
        user: AuthContext | null,
      ) {
        if (!user) {
          throw new UnauthorizedException(
            "AUTH_REQUIRED",
          );
        }
      
        if (
          !hasPermission(
            user,
            "customer.odoo.sync",
          )
        ) {
          throw new ForbiddenException(
            "PERMISSION_DENIED",
          );
        }
      
        return user;
      }
  }