import { CartPageBody } from "../../components/storefront/cart-lines";
import { StorefrontShell } from "../../components/storefront/shell";
import { StorefrontUnavailable } from "../../components/system/storefront-unavailable";
import { getCurrentUser } from "../../lib/api/auth";
import { getCurrentCart } from "../../lib/api/cart";
import { getBusinessStatus } from "../../lib/api/customers";
import { safeApiCall } from "../../lib/api/safe";
import { getDisplayCurrencyState } from "../../lib/display-currency";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; minQty?: string; available?: string }>;
}) {
  const { error, minQty, available } = await searchParams;
  const loaded = await safeApiCall(async () => {
    const me = await getCurrentUser();
    const status = me.authenticated ? await getBusinessStatus() : { canViewWholesalePrices: false };
    const cart = me.authenticated ? await getCurrentCart() : null;
    return { me, canBuy: status.canViewWholesalePrices, cart };
  });
  if (!loaded.ok) return <StorefrontUnavailable />;
  const { me, canBuy, cart } = loaded.data;
  const { code: currency, catalog } = await getDisplayCurrencyState();

  return (
    <StorefrontShell>
      <main className="sf-account sf-cart-page">
        <p className="sf-kicker">Cart</p>
        <h1>Your order list.</h1>
        <CartPageBody
          initialCart={cart}
          error={error}
          minQty={minQty}
          availableQty={available}
          currency={currency}
          catalog={catalog}
          authenticated={me.authenticated}
          canBuy={canBuy}
        />
      </main>
    </StorefrontShell>
  );
}
