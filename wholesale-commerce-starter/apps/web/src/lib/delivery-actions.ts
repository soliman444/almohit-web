"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiClientError, ApiUnavailableError } from "./api/client";
import { parseOdooRecordId } from "./odoo/catalog";
import { updateOdooDeliveryStatus, type DeliveryAction } from "./odoo/deliveries";
import { requireDistributor } from "./storefront-session";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function isDeliveryAction(value: string): value is DeliveryAction {
  return value === "ready" || value === "delivered";
}

export async function updateDeliveryStatusAction(formData: FormData) {
  await requireDistributor();
  const deliveryId = parseOdooRecordId(value(formData, "deliveryId"));
  const status = value(formData, "status");
  if (!deliveryId) redirect("/account/deliveries?error=notfound");
  if (!isDeliveryAction(status)) redirect(`/account/deliveries/${deliveryId}?error=status`);

  try {
    await updateOdooDeliveryStatus(deliveryId, status);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      redirect(`/account/deliveries/${deliveryId}?error=unavailable`);
    }
    if (error instanceof ApiClientError) {
      if (error.code === "DELIVERY_NOT_FOUND") redirect("/account/deliveries?error=notfound");
      if (error.code === "PAYMENT_REQUIRED") redirect("/account/deliveries?error=payment");
      if (error.code === "DISTRIBUTOR_REQUIRED") redirect("/account");
      redirect(`/account/deliveries/${deliveryId}?error=status`);
    }
    throw error;
  }

  revalidatePath("/account/deliveries");
  revalidatePath(`/account/deliveries/${deliveryId}`);
  redirect(`/account/deliveries/${deliveryId}?updated=1`);
}
