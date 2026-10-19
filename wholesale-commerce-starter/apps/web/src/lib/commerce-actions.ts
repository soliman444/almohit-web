"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirectIfPrismaStaff } from "./storefront-session";
import { addCartItem, clearCart, removeCartItem, updateCartItem } from "./api/cart";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "./api/addresses";
import { parseOdooRecordId } from "./odoo/catalog";
import { mapOdooAddressError } from "./odoo/addresses";
import { ApiClientError, ApiUnavailableError } from "./api/client";
import { CommerceError, commerceErrorCode, type CommerceErrorCode } from "./commerce-errors";
import { mapOdooCartError } from "./odoo/cart";
import type { CartMutationResult, CartView } from "./cart-view";

export type { CartMutationResult };
import { safeStorefrontReturnTo } from "./storefront-paths";

export { safeStorefrontReturnTo };

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function withError(path: string, error: unknown) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("error", commerceErrorCode(error));
  if (error instanceof CommerceError && error.details?.minOrderQuantity != null) {
    url.searchParams.set("minQty", String(error.details.minOrderQuantity));
  }
  if (error instanceof CommerceError && error.details?.availableQuantity != null) {
    url.searchParams.set("available", String(error.details.availableQuantity));
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function revalidateStore() {
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "layout");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account", "layout");
  revalidatePath("/account/orders");
  revalidatePath("/account/invoices");
  revalidatePath("/account/payments");
  revalidatePath("/account/addresses");
  revalidatePath("/admin/orders");
}

function mapUnavailable(error: unknown): CommerceError | null {
  return error instanceof ApiUnavailableError ? new CommerceError("SERVICE_UNAVAILABLE") : null;
}

function mapCartApiError(error: unknown): CommerceError {
  const unavailable = mapUnavailable(error);
  if (unavailable) return unavailable;
  if (error instanceof ApiClientError) {
    if (
      error.code === "MIN_ORDER_QUANTITY_NOT_MET"
      || error.code === "WHOLESALE_APPROVAL_REQUIRED"
      || error.code === "PRODUCT_NOT_FOUND"
      || error.code === "PRODUCT_UNAVAILABLE"
      || error.code === "CART_LINE_NOT_FOUND"
      || error.code === "INSUFFICIENT_STOCK"
      || error.code === "INVALID_QUANTITY"
    ) {
      return mapOdooCartError(error);
    }
    const mapped: Record<string, CommerceErrorCode> = {
      AUTH_REQUIRED: "UNAPPROVED",
      PRICE_ACCESS_DENIED: "UNAPPROVED",
      PRODUCT_UNAVAILABLE: "PRODUCT",
      VARIANT_NOT_FOUND: "VARIANT",
      PRICE_UNAVAILABLE: "PRICE",
      MOQ_NOT_MET: "MINIMUM",
      INSUFFICIENT_STOCK: "STOCK",
      CART_ITEM_NOT_FOUND: "ITEM",
      CART_UNAVAILABLE: "CART",
      INVALID_QUANTITY: "QUANTITY",
    };
    return new CommerceError(mapped[error.code] ?? "CART");
  }
  return error instanceof CommerceError ? error : new CommerceError("CART");
}

async function requireStorefrontBuyer() {
  await redirectIfPrismaStaff();
  const odoo = await import("./odoo/auth");
  if (!(await odoo.hasOdooSession())) redirect("/login");
  const customer = await odoo.getCurrentCustomer();
  if (!customer) redirect("/login");
  if (customer.tradeStatus !== "approved") redirect("/account/business");
}

async function runCartMutation(run: () => Promise<CartView | null>): Promise<CartMutationResult> {
  try {
    const cart = await run();
    revalidateStore();
    return { ok: true, cart };
  } catch (error) {
    const mapped = mapCartApiError(error);
    return {
      ok: false,
      error: mapped.code,
      minOrderQuantity: mapped.details?.minOrderQuantity,
      availableQuantity: mapped.details?.availableQuantity,
    };
  }
}

export async function addToCartAction(formData: FormData): Promise<CartMutationResult> {
  await requireStorefrontBuyer();
  const quantity = Number(value(formData, "quantity") || "1");
  return runCartMutation(() => addCartItem({
    productId: value(formData, "productId"),
    quantity,
    variantId: value(formData, "variantId") || null,
  }));
}

export async function updateCartItemQuantityAction(formData: FormData): Promise<CartMutationResult> {
  await requireStorefrontBuyer();
  return runCartMutation(() => updateCartItem(value(formData, "itemId"), {
    quantity: Number(value(formData, "quantity")),
  }));
}

export async function removeCartItemAction(formData: FormData): Promise<CartMutationResult> {
  await requireStorefrontBuyer();
  return runCartMutation(() => removeCartItem(value(formData, "itemId")));
}

export async function clearCartAction(_formData?: FormData): Promise<CartMutationResult> {
  await requireStorefrontBuyer();
  return runCartMutation(() => clearCart());
}

function mapAddressApiError(error: unknown): CommerceError {
  const unavailable = mapUnavailable(error);
  if (unavailable) return unavailable;
  if (error instanceof ApiClientError) {
    const mapped: Record<string, CommerceErrorCode> = {
      AUTH_REQUIRED: "UNAPPROVED",
      CUSTOMER_REQUIRED: "UNAPPROVED",
      ADDRESS_NOT_FOUND: "ADDRESS",
      INVALID_ADDRESS: "ADDRESS",
    };
    if (mapped[error.code]) return new CommerceError(mapped[error.code]);
    return mapOdooAddressError(error);
  }
  return error instanceof CommerceError ? error : new CommerceError("ADDRESS");
}

function addressPayload(formData: FormData) {
  return {
    label: value(formData, "label") || undefined,
    recipient: value(formData, "recipient"),
    phone: value(formData, "phone") || undefined,
    line1: value(formData, "line1"),
    line2: value(formData, "line2") || undefined,
    city: value(formData, "city"),
    region: value(formData, "region") || undefined,
    postalCode: value(formData, "postalCode") || undefined,
    country: value(formData, "country") || "SA",
    isDefault: formData.get("isDefault") === "on",
    type: value(formData, "type") || undefined,
    countryId: value(formData, "countryId") || undefined,
  };
}

function addressReturnPath(formData: FormData) {
  return safeStorefrontReturnTo(value(formData, "returnTo"));
}

function withAddressQuery(path: string, saved: boolean) {
  if (path === "/checkout") return saved ? "/checkout?address=saved" : "/checkout";
  if (path === "/cart") return saved ? "/cart?address=saved" : "/cart";
  return saved ? "/account/addresses?saved=1" : "/account/addresses";
}

function addressErrorPath(formData: FormData, error: unknown) {
  const next = addressReturnPath(formData);
  const url = new URL("/account/addresses", "http://local.invalid");
  url.searchParams.set("error", commerceErrorCode(error));
  if (next === "/checkout") url.searchParams.set("returnTo", "/checkout");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export async function createAddressAction(formData: FormData) {
  await requireStorefrontBuyer();
  const next = addressReturnPath(formData);
  try {
    await createAddress(addressPayload(formData));
  } catch (error) {
    redirect(addressErrorPath(formData, mapAddressApiError(error)));
  }
  revalidateStore();
  redirect(withAddressQuery(next, true));
}

export async function updateAddressAction(formData: FormData) {
  await requireStorefrontBuyer();
  const next = addressReturnPath(formData);
  try {
    await updateAddress(value(formData, "id"), addressPayload(formData));
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "ADDRESS_NOT_FOUND") redirect("/account/addresses");
    redirect(addressErrorPath(formData, mapAddressApiError(error)));
  }
  revalidateStore();
  redirect(withAddressQuery(next, true));
}

export async function deleteAddressAction(formData: FormData) {
  await requireStorefrontBuyer();
  const next = addressReturnPath(formData);
  try {
    await deleteAddress(value(formData, "id"));
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "ADDRESS_NOT_FOUND") redirect("/account/addresses");
    redirect(addressErrorPath(formData, mapAddressApiError(error)));
  }
  revalidateStore();
  redirect(withAddressQuery(next, false));
}

export async function setDefaultAddressAction(formData: FormData) {
  await requireStorefrontBuyer();
  try {
    await setDefaultAddress(value(formData, "id"));
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "ADDRESS_NOT_FOUND") redirect("/account/addresses");
    redirect(withError("/account/addresses", mapAddressApiError(error)));
  }
  revalidateStore();
  redirect("/account/addresses");
}

export type StorefrontPayResult =
  | { ok: true; alreadyPaid: true }
  | {
      ok: true;
      alreadyPaid: false;
      transactionId: string;
      transactionState: string;
      redirectFormHtml: string | null;
      redirectUrl: string | null;
    }
  | { ok: false; error: CommerceErrorCode };

export async function startStorefrontInvoicePayment(
  invoiceId: string,
  providerId: string,
): Promise<StorefrontPayResult> {
  const odoo = await import("./odoo/auth");
  if (!(await odoo.hasOdooSession())) return { ok: false, error: "UNAPPROVED" };
  await requireStorefrontBuyer();
  const invoiceRecordId = parseOdooRecordId(invoiceId);
  const providerRecordId = parseOdooRecordId(providerId);
  if (!invoiceRecordId || !providerRecordId) return { ok: false, error: "PAYMENT" };
  try {
    const { startOdooInvoicePayment } = await import("./odoo/online-payments");
    const transaction = await startOdooInvoicePayment(invoiceRecordId, providerRecordId);
    revalidateStore();
    const processing = transaction.paymentFlow?.processing ?? {};
    const redirectUrl = typeof processing.redirect_url === "string" ? processing.redirect_url : null;
    return {
      ok: true,
      alreadyPaid: false,
      transactionId: transaction.id,
      transactionState: transaction.state,
      redirectFormHtml: transaction.paymentFlow?.redirectFormHtml ?? null,
      redirectUrl,
    };
  } catch (error) {
    const mapped = mapOdooInvoicePaymentError(error);
    if (mapped.code === "PAID") {
      revalidateStore();
      return { ok: true, alreadyPaid: true };
    }
    return { ok: false, error: mapped.code };
  }
}

export async function refreshStorefrontInvoice(invoiceId: string) {
  const odoo = await import("./odoo/auth");
  if (!(await odoo.hasOdooSession())) return null;
  const { parseOdooRecordId: parseId } = await import("./odoo/catalog");
  const { getOdooInvoice } = await import("./odoo/invoices");
  const id = parseId(invoiceId);
  if (!id) return null;
  try {
    const invoice = await getOdooInvoice(id);
    if (invoice.paymentState === "paid" || Number(invoice.amountResidual.amount) <= 0) {
      revalidateStore();
    }
    return {
      paymentState: invoice.paymentState,
      residual: invoice.amountResidual.amount,
      state: invoice.state,
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "INVOICE_NOT_FOUND") return null;
    throw error;
  }
}

export async function refreshStorefrontTransaction(transactionId: string) {
  const odoo = await import("./odoo/auth");
  if (!(await odoo.hasOdooSession())) return null;
  const id = parseOdooRecordId(transactionId);
  if (!id) return null;
  try {
    const { getOdooPaymentTransaction } = await import("./odoo/online-payments");
    const transaction = await getOdooPaymentTransaction(id);
    return { id: transaction.id, state: transaction.state };
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "TRANSACTION_NOT_FOUND") return null;
    throw error;
  }
}

function mapOdooInvoicePaymentError(error: unknown): CommerceError {
  const unavailable = mapUnavailable(error);
  if (unavailable) return unavailable;
  if (error instanceof ApiClientError) {
    const mapped: Record<string, CommerceErrorCode> = {
      INVOICE_NOT_FOUND: "INVOICE",
      INVOICE_NOT_PAYABLE: "PAYMENT",
      INVOICE_ALREADY_PAID: "PAID",
      PROVIDER_NOT_AVAILABLE: "PAYMENT",
      TRANSACTION_NOT_FOUND: "PAYMENT",
      UNAUTHENTICATED: "UNAPPROVED",
    };
    return new CommerceError(mapped[error.code] ?? "PAYMENT");
  }
  return error instanceof CommerceError ? error : new CommerceError("PAYMENT");
}
