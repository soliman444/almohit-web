"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CommerceError, commerceErrorCode } from "./commerce-errors";
import { getCurrentCustomer, hasOdooSession } from "./odoo/auth";
import { parseOdooRecordId } from "./odoo/catalog";
import { checkoutOdooCart, mapOdooCheckoutError } from "./odoo/checkout";

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

export async function placeOdooOrderAction(formData: FormData) {
  if (!(await hasOdooSession())) redirect("/login");
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");
  if (customer.tradeStatus !== "approved") redirect("/account/business");

  const shippingAddressId = parseOdooRecordId(value(formData, "shippingAddressId"));
  const invoiceAddressId = parseOdooRecordId(value(formData, "invoiceAddressId"));
  if (!shippingAddressId || !invoiceAddressId) {
    redirect(withError("/checkout", new CommerceError("ADDRESS")));
  }

  let orderId = "";
  try {
    const order = await checkoutOdooCart({
      shipping_address_id: shippingAddressId,
      invoice_address_id: invoiceAddressId,
    });
    orderId = order.id;
  } catch (error) {
    redirect(withError("/checkout", mapOdooCheckoutError(error)));
  }
  revalidateStore();
  redirect(`/account/orders/${orderId}?placed=1`);
}
