import { Module } from "@nestjs/common";
import { OdooClient } from "./odoo.client";
import { OdooController } from "./odoo.controller";
import { OdooService } from "./odoo.service";
import { OdooPartnerService } from "./odoo-partner.service";


@Module({
  controllers: [
    OdooController,
  ],

  providers: [
    OdooClient,
    OdooService,
    OdooPartnerService,
  ],

  exports: [
    OdooService,
    OdooPartnerService,
  ],
})
export class OdooModule {}
