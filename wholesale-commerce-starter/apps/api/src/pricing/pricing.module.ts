import { Global, Module } from "@nestjs/common";
import { PriceAccessService } from "./price-access.service";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Global()
@Module({
  controllers: [PricingController],
  providers: [PriceAccessService, PricingService],
  exports: [PriceAccessService, PricingService],
})
export class PricingModule {}
