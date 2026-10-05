import { getCurrentUser, hasPermission, isSuperAdmin } from "../../lib/auth";
import { getCurrentCart, isApprovedBuyer } from "../../lib/commerce";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import { HeaderBar } from "./header-bar";

export async function StorefrontHeader({
  transparent,
  currency,
  currencies,
}: {
  transparent?: boolean;
  currency: DisplayCurrencyCode;
  currencies: DisplayCurrencyConfig[];
}) {
  const user = await getCurrentUser();
  const canAdmin = Boolean(user && (isSuperAdmin(user) || hasPermission(user, "product.view") || hasPermission(user, "user.view") || hasPermission(user, "order.view")));
  const cart = await getCurrentCart(user);
  return (
    <HeaderBar
      transparent={transparent}
      signedIn={Boolean(user)}
      canAdmin={canAdmin}
      canBuy={isApprovedBuyer(user)}
      cart={cart}
      currency={currency}
      currencies={currencies}
    />
  );
}
