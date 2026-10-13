import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getCurrentUser as getPrismaUser, isStaffUser } from "../../lib/auth";
import { getCurrentUser as getStorefrontUser } from "../../lib/api/auth";
import { getCurrentCart } from "../../lib/api/cart";
import { getBusinessStatus } from "../../lib/api/customers";
import { safeApiCall } from "../../lib/api/safe";
import { ODOO_SESSION_COOKIE_NAME } from "../../lib/odoo/config";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import type { CartView } from "../../lib/cart-view";
import { CartSessionProvider } from "./cart-session";
import { HeaderBar } from "./header-bar";

const STAFF_SESSION_COOKIE = "wholesale_session";

async function hasStorefrontSessionCookie() {
  const jar = await cookies();
  return Boolean(jar.get(ODOO_SESSION_COOKIE_NAME)?.value || jar.get(STAFF_SESSION_COOKIE)?.value);
}

export async function StorefrontHeader({
  transparent,
  currency,
  currencies,
  children,
}: {
  transparent?: boolean;
  currency: DisplayCurrencyCode;
  currencies: DisplayCurrencyConfig[];
  children?: ReactNode;
}) {
  const result = await safeApiCall(async () => {
    const staff = await getPrismaUser();
    if (staff && staff.status === "ACTIVE" && isStaffUser(staff)) {
      return {
        kind: "staff" as const,
        me: { authenticated: true as const, user: { id: staff.id, email: staff.email, name: staff.name } },
        status: { canViewWholesalePrices: false, state: null, hasActivePriceGroup: false },
        cart: null as CartView | null,
      };
    }
    const [me, status, cart] = await Promise.all([
      getStorefrontUser(),
      getBusinessStatus(),
      getCurrentCart().catch(() => null),
    ]);
    return {
      kind: me.authenticated ? "customer" as const : "guest" as const,
      me,
      status,
      cart,
    };
  });

  if (!result.ok) {
    return (
      <CartSessionProvider initialCart={null}>
        <HeaderBar
          transparent={transparent}
          signedIn={await hasStorefrontSessionCookie()}
          canAdmin={false}
          canBuy={false}
          cart={null}
          currency={currency}
          currencies={currencies}
          serviceUnavailable
        />
        {children}
      </CartSessionProvider>
    );
  }

  const { me, status, cart, kind } = result.data;
  const isStaff = kind === "staff";
  const canAdmin = isStaff;
  const headerCart = isStaff ? null : cart;

  return (
    <CartSessionProvider initialCart={headerCart}>
      <HeaderBar
        transparent={transparent}
        signedIn={me.authenticated}
        canAdmin={canAdmin}
        canBuy={!isStaff && status.canViewWholesalePrices}
        isStaff={isStaff}
        cart={headerCart}
        currency={currency}
        currencies={currencies}
      />
      {children}
    </CartSessionProvider>
  );
}
