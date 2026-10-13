import { Injectable } from "@nestjs/common";
import { authorizedPriceGroupId, canSeeProductPrices } from "@almohit/validation";
import type { AuthContext } from "../auth/auth.types";

@Injectable()
export class PriceAccessService {
  canViewWholesalePrices(user: AuthContext | null) {
    return canSeeProductPrices(this.toPriceAuth(user));
  }

  hasActivePriceGroup(user: AuthContext | null) {
    return Boolean(user?.customer?.priceGroupId && user.customer.priceGroup?.status === "ACTIVE");
  }

  authorizedPriceGroupId(user: AuthContext | null) {
    return authorizedPriceGroupId(this.toPriceAuth(user));
  }

  eligibility(user: AuthContext | null) {
    return {
      canViewWholesalePrices: this.canViewWholesalePrices(user),
      hasActivePriceGroup: this.hasActivePriceGroup(user),
    };
  }

  private toPriceAuth(user: AuthContext | null) {
    if (!user) return null;
    if (!user.customer) return { customer: null };
    return {
      customer: {
        businessStatus: user.customer.businessStatus,
        priceGroupId: user.customer.priceGroupId,
        priceGroup: user.customer.priceGroup,
      },
    };
  }
}
