import {
    Controller,
    Get,
    Header,
    HttpCode,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    Post,
    UseGuards,
  } from "@nestjs/common";
  import { OdooService } from "./odoo.service";
  import {
    OdooAuthenticationError,
    OdooRpcError,
    OdooUnavailableError,
  } from "./odoo.errors";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { OdooPartnerService } from "./odoo-partner.service";
  
  @Controller("odoo")
  @UseGuards(OptionalSessionGuard)
  export class OdooController {
    constructor(
        @Inject(OdooService)
        private readonly odooService: OdooService,
        @Inject(OdooPartnerService)
        private readonly odooPartnerService: OdooPartnerService,
    ) {}
  
    @Get("health")
    async health() {
      try {
        return await this.odooService.health();
      } catch (error) {
        if (error instanceof OdooUnavailableError) {
          throw new HttpException(
            {
              code: "ODOO_UNAVAILABLE",
              message: "Odoo service is unavailable",
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
  
        if (error instanceof OdooAuthenticationError) {
          throw new HttpException(
            {
              code: "ODOO_AUTH_FAILED",
              message: "Odoo authentication failed",
            },
            HttpStatus.BAD_GATEWAY,
          );
        }
  
        if (error instanceof OdooRpcError) {
          throw new HttpException(
            {
              code: "ODOO_RPC_ERROR",
              message: "Odoo request failed",
            },
            HttpStatus.BAD_GATEWAY,
          );
        }
  
        throw error;
      }
    }
    @Post("customers/:customerId/sync")
    @HttpCode(200)
    @Header("Cache-Control", "private, no-store")
    async syncCustomer(
      @CurrentUser() user: AuthContext | null,
      @Param("customerId") customerId: string,
    ) {
      return this.odooPartnerService.syncCustomer(
        user,
        customerId,
      );
    }
  }