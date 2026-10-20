import type { AddressDto, AuthMeResponse, BusinessStatusResponse, CustomerProfile } from "@/types/contracts";
import type { CartView } from "./cart-view";
import { getAddresses } from "./addresses";
import { getCurrentCart } from "./cart";
import { getBusinessStatus, getCurrentCustomer, getCurrentCustomerSession } from "../session/customer";
import { ApiClientError } from "../odoo/errors";
import type { PaymentTerm } from "../odoo/types";
import type { StorefrontAddress } from "../odoo/addresses";

export type CheckoutRedirect = {
  type: "redirect";
  to: string;
};

export type CheckoutReady = {
  type: "ready";
  userName: string;
  userPhone: string | null;
  cart: CartView;
  addresses: AddressDto[];
  selected: AddressDto | null;
  paymentTerm: PaymentTerm | null;
  shippingAddresses: StorefrontAddress[];
  invoiceAddresses: StorefrontAddress[];
  selectedShipping: StorefrontAddress | null;
  selectedInvoice: StorefrontAddress | null;
};

export type CheckoutPageModel = CheckoutRedirect | CheckoutReady;

export type CheckoutReadDeps = {
  getCurrentCustomerSession: () => Promise<AuthMeResponse>;
  getCurrentCustomer: () => Promise<CustomerProfile | null>;
  getBusinessStatus: () => Promise<BusinessStatusResponse>;
  getCurrentCart: () => Promise<CartView | null>;
  getAddresses: () => Promise<AddressDto[]>;
  getPaymentTerm?: () => Promise<PaymentTerm | null>;
};

const defaultDeps: CheckoutReadDeps = {
  getCurrentCustomerSession,
  getCurrentCustomer,
  getBusinessStatus,
  getCurrentCart,
  getAddresses,
  getPaymentTerm: async () => {
    const odoo = await import("../odoo/auth");
    if (!(await odoo.hasOdooSession())) return null;
    const customer = await odoo.getCurrentCustomer();
    return customer?.paymentTerm ?? null;
  },
};

export function isCheckoutEligible(
  customer: CustomerProfile | null,
  status: Pick<BusinessStatusResponse, "canViewWholesalePrices">,
) {
  return Boolean(customer && customer.role === "merchant" && status.canViewWholesalePrices);
}

export function checkoutCartRedirect(cart: CartView | null): CheckoutRedirect | null {
  if (!cart || !cart.id || cart.items.length === 0) {
    return { type: "redirect", to: "/cart?error=EMPTY" };
  }
  if (!cart.canCheckout) {
    return { type: "redirect", to: "/cart?error=CHECKOUT" };
  }
  return null;
}

export function selectCheckoutAddress(addresses: AddressDto[], addressId?: string | null) {
  return addresses.find((item) => item.id === addressId) ?? addresses.find((item) => item.isDefault) ?? null;
}

export function selectTypedAddress(addresses: StorefrontAddress[], addressId?: string | null) {
  return addresses.find((item) => item.id === addressId) ?? addresses[0] ?? null;
}

export function checkoutApiRedirect(error: unknown): CheckoutRedirect | null {
  if (!(error instanceof ApiClientError)) return null;
  if (error.statusCode === 401 || error.code === "AUTH_REQUIRED") {
    return { type: "redirect", to: "/login" };
  }
  if (
    error.statusCode === 403 ||
    error.code === "CUSTOMER_REQUIRED" ||
    error.code === "PRICE_ACCESS_DENIED" ||
    error.code === "WHOLESALE_APPROVAL_REQUIRED"
  ) {
    return { type: "redirect", to: "/account/business" };
  }
  return null;
}

export async function loadCheckoutPage(
  search: { address?: string; shipping?: string; invoice?: string },
  deps: CheckoutReadDeps = defaultDeps,
): Promise<CheckoutPageModel> {
  try {
    const me = await deps.getCurrentCustomerSession();
    if (!me.authenticated || !me.user) return { type: "redirect", to: "/login" };

    const [customer, status] = await Promise.all([deps.getCurrentCustomer(), deps.getBusinessStatus()]);
    if (!isCheckoutEligible(customer, status)) return { type: "redirect", to: "/account/business" };

    const cart = await deps.getCurrentCart();
    const cartRedirect = checkoutCartRedirect(cart);
    if (cartRedirect) return cartRedirect;

    const addresses = await deps.getAddresses();
    const paymentTerm = deps.getPaymentTerm ? await deps.getPaymentTerm() : null;
    const typed = addresses as StorefrontAddress[];
    const shippingAddresses = typed.filter((item) => item.type === "delivery");
    const invoiceAddresses = typed.filter((item) => item.type === "invoice");
    return {
      type: "ready",
      userName: me.user.name,
      userPhone: customer!.phone,
      cart: cart!,
      addresses,
      selected: selectCheckoutAddress(addresses, search.address),
      paymentTerm,
      shippingAddresses,
      invoiceAddresses,
      selectedShipping: selectTypedAddress(shippingAddresses, search.shipping),
      selectedInvoice: selectTypedAddress(invoiceAddresses, search.invoice),
    };
  } catch (error) {
    const mapped = checkoutApiRedirect(error);
    if (mapped) return mapped;
    throw error;
  }
}
