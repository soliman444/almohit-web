import { Inject, Injectable } from "@nestjs/common";
import type { BusinessStatusResponse, CustomerProfile } from "@almohit/contracts";
import type { AuthContext } from "../auth/auth.types";
import { PriceAccessService } from "../pricing/price-access.service";

const BUSINESS_STATES = new Set(["NORMAL", "PENDING", "APPROVED", "REJECTED"]);

function asBusinessState(value: string): CustomerProfile["state"] {
  if (BUSINESS_STATES.has(value)) return value as CustomerProfile["state"];
  return "NORMAL";
}

@Injectable()
export class CustomersService {
  constructor(@Inject(PriceAccessService) private readonly prices: PriceAccessService) {}

  profile(user: AuthContext): CustomerProfile | null {
    if (!user.customer) return null;
    return {
      id: user.customer.id,
      state: asBusinessState(user.customer.businessStatus),
      companyName: user.customer.companyName,
      businessName: user.customer.businessName,
      phone: user.phone,
      priceAccess: this.prices.canViewWholesalePrices(user),
      priceGroupName: user.customer.priceGroup?.name ?? null,
    };
  }

  businessStatus(user: AuthContext): BusinessStatusResponse {
    const eligibility = this.prices.eligibility(user);
    if (!user.customer) {
      return {
        state: null,
        canViewWholesalePrices: false,
        hasActivePriceGroup: false,
      };
    }
    return {
      state: asBusinessState(user.customer.businessStatus),
      canViewWholesalePrices: eligibility.canViewWholesalePrices,
      hasActivePriceGroup: eligibility.hasActivePriceGroup,
    };
  }
}
