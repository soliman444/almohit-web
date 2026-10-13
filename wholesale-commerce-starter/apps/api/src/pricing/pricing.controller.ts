import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { PricingService } from "./pricing.service";

@ApiTags("pricing")
@Controller("pricing")
@UseGuards(OptionalSessionGuard)
export class PricingController {
  constructor(@Inject(PricingService) private readonly pricing: PricingService) {}

  @Get("products/:productId/variants/:variantId")
  variant(
    @CurrentUser() user: AuthContext | null,
    @Param("productId") productId: string,
    @Param("variantId") variantId: string,
  ) {
    return this.pricing.resolveVariantPrice(user, productId, variantId);
  }

  @Get("products/:productId")
  product(@CurrentUser() user: AuthContext | null, @Param("productId") productId: string) {
    return this.pricing.resolveProductPrice(user, productId);
  }
}
