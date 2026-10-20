"use server";

import { redirect } from "next/navigation";
import { requireMerchant } from "../session/access";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "../commerce/addresses";
import { mapOdooAddressError } from "../odoo/addresses";
import { ApiClientError } from "../odoo/errors";
import { CommerceError, commerceErrorCode, type CommerceErrorCode } from "../commerce/errors";
import { safeStorefrontReturnTo } from "../catalog/paths";
import { mapUnavailable, revalidateStore, value, withError } from "./shared";

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
  await requireMerchant();
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
  await requireMerchant();
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
  await requireMerchant();
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
  await requireMerchant();
  try {
    await setDefaultAddress(value(formData, "id"));
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "ADDRESS_NOT_FOUND") redirect("/account/addresses");
    redirect(withError("/account/addresses", mapAddressApiError(error)));
  }
  revalidateStore();
  redirect("/account/addresses");
}
