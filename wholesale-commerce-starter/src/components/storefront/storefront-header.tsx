import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getCurrentStaff, isStaffUser } from "../../lib/session/staff";
import { getBusinessStatus, getCurrentCustomerSession } from "../../lib/session/customer";
import { getCurrentCart } from "../../lib/commerce/cart";
import { safeApiCall } from "../../lib/odoo/safe";
import { ODOO_SESSION_COOKIE_NAME } from "../../lib/odoo/config";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import type { CartView } from "../../lib/commerce/cart-view";
import { CartSessionProvider } from "./cart-session";
import { HeaderBar } from "./header-bar";

async function hasStorefrontSessionCookie() {
  const jar = await cookies();
  return Boolean(jar.get(ODOO_SESSION_COOKIE_NAME)?.value);
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
    const staff = await getCurrentStaff();
    if (staff && isStaffUser(staff)) {
      return {
        kind: "staff" as const,
        me: { authenticated: true as const, user: { id: staff.id, email: staff.email, name: staff.name } },
        status: { canViewWholesalePrices: false, state: null },
        cart: null as CartView | null,
      };
    }
    const [me, status, cart] = await Promise.all([
      getCurrentCustomerSession(),
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
  const headerCart = isStaff ? null : cart;

  return (
    <CartSessionProvider initialCart={headerCart}>
      <HeaderBar
        transparent={transparent}
        signedIn={me.authenticated}
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
