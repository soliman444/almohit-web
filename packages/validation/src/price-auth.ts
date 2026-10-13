export type PriceAuthCustomer = {
  businessStatus: string;
  priceGroupId: string | null;
  priceGroup?: { status: string } | null;
};

export type PriceAuthUser = {
  customer?: PriceAuthCustomer | null;
} | null | undefined;

export function canSeeProductPrices(user: PriceAuthUser) {
  return Boolean(
    user?.customer?.businessStatus === "APPROVED" &&
      user.customer.priceGroupId &&
      user.customer.priceGroup?.status === "ACTIVE",
  );
}

export function isApprovedBuyer(user: PriceAuthUser) {
  return canSeeProductPrices(user);
}

export function authorizedPriceGroupId(user: PriceAuthUser) {
  return canSeeProductPrices(user) ? user!.customer!.priceGroupId : null;
}
