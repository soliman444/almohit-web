import type { AddressDto } from "@almohit/contracts";
import { ApiClientError } from "../api/client";
import { CommerceError } from "../commerce-errors";
import { parseOdooRecordId } from "./catalog";
import { odooRequest } from "./client";
import type { OdooCookieAdapter } from "./types";

export type OdooAddressType = "delivery" | "invoice";

export type OdooNamedRef = {
  id: number;
  name: string;
  code?: string | null;
};

export type OdooAddressPayload = {
  id: number;
  type: string;
  name: string;
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: OdooNamedRef | null;
  zip?: string | null;
  country?: OdooNamedRef | null;
  phone?: string | null;
};

export type StorefrontAddress = AddressDto & {
  type: OdooAddressType;
  countryCode: string | null;
  countryId: string | null;
};

export type SubmitStorefrontAddressInput = {
  type: OdooAddressType;
  name: string;
  street: string;
  street2?: string;
  city: string;
  zip?: string;
  phone?: string;
  countryCode?: string;
  countryId?: number;
};

const UNOAUTH_STATUSES = new Set([401, 403, 302, 303, 307, 308]);

export function odooAddressBody(input: SubmitStorefrontAddressInput) {
  const body: Record<string, unknown> = {
    type: input.type,
    name: input.name,
    street: input.street,
    city: input.city,
  };
  if (input.street2) body.street2 = input.street2;
  if (input.zip) body.zip = input.zip;
  if (input.phone) body.phone = input.phone;
  if (input.countryId) body.country_id = input.countryId;
  else if (input.countryCode) body.country_code = input.countryCode.toUpperCase();
  return body;
}

export function mapOdooAddress(payload: OdooAddressPayload): StorefrontAddress {
  const type: OdooAddressType = payload.type === "invoice" ? "invoice" : "delivery";
  return {
    id: String(payload.id),
    label: type === "invoice" ? "Invoice" : "Delivery",
    recipient: payload.name || "",
    phone: payload.phone || null,
    line1: payload.street || "",
    line2: payload.street2 || null,
    city: payload.city || "",
    region: payload.state?.name ?? null,
    postalCode: payload.zip || null,
    country: payload.country?.code || payload.country?.name || "",
    isDefault: false,
    type,
    countryCode: payload.country?.code ?? null,
    countryId: payload.country?.id != null ? String(payload.country.id) : null,
  };
}

export function mapOdooAddressError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof ApiClientError) {
    if (error.code === "WHOLESALE_APPROVAL_REQUIRED" || error.code === "UNAUTHENTICATED") {
      return new CommerceError("UNAPPROVED");
    }
    if (
      error.code === "ADDRESS_NOT_FOUND"
      || error.code === "ADDRESS_TYPE_INVALID"
      || error.code === "COUNTRY_REQUIRED"
      || error.code === "COUNTRY_NOT_FOUND"
      || error.code === "NAME_REQUIRED"
      || error.code === "STREET_REQUIRED"
      || error.code === "CITY_REQUIRED"
      || error.code === "STATE_NOT_FOUND"
      || error.code === "STATE_COUNTRY_MISMATCH"
    ) {
      return new CommerceError("ADDRESS");
    }
    return new CommerceError("ADDRESS");
  }
  return new CommerceError("ADDRESS");
}

export async function listOdooAddresses(cookies?: OdooCookieAdapter): Promise<StorefrontAddress[]> {
  try {
    const payload = await odooRequest<OdooAddressPayload[]>("/addresses", {
      method: "GET",
      cookies,
      captureSetCookie: false,
    });
    return (payload ?? []).map(mapOdooAddress);
  } catch (error) {
    if (isUnauthenticated(error)) return [];
    throw error;
  }
}

export async function createOdooAddress(
  input: SubmitStorefrontAddressInput,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontAddress> {
  const payload = await odooRequest<OdooAddressPayload>("/addresses", {
    method: "POST",
    cookies,
    captureSetCookie: false,
    body: odooAddressBody(input),
  });
  return mapOdooAddress(payload);
}

export async function updateOdooAddress(
  addressId: number,
  input: SubmitStorefrontAddressInput,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontAddress> {
  const payload = await odooRequest<OdooAddressPayload>(`/addresses/${addressId}`, {
    method: "PATCH",
    cookies,
    captureSetCookie: false,
    body: odooAddressBody(input),
  });
  return mapOdooAddress(payload);
}

export async function deleteOdooAddress(addressId: number, cookies?: OdooCookieAdapter): Promise<void> {
  await odooRequest<null>(`/addresses/${addressId}`, {
    method: "DELETE",
    cookies,
    captureSetCookie: false,
  });
}

export function parseAddressType(value: string | null | undefined): OdooAddressType {
  return value === "invoice" ? "invoice" : "delivery";
}

export function parseCountryInput(value: string, fallbackId?: string | null): Pick<SubmitStorefrontAddressInput, "countryCode" | "countryId"> {
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return { countryCode: trimmed.toUpperCase() };
  const id = parseOdooRecordId(fallbackId);
  if (id) return { countryId: id };
  return { countryCode: trimmed.toUpperCase() };
}

function isUnauthenticated(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return UNOAUTH_STATUSES.has(error.status) || error.code === "UNAUTHENTICATED";
}
