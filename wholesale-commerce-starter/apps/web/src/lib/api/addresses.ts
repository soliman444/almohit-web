import type {
  AddressDeleteResponse,
  AddressDto,
  AddressListResponse,
  AddressMutationResponse,
  AddressWriteRequest,
} from "@almohit/contracts";
import { parseOdooRecordId } from "../odoo/catalog";
import { parseAddressType, parseCountryInput } from "../odoo/addresses";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type AddressWriteInput = AddressWriteRequest & {
  type?: string;
  countryId?: string | null;
};

export async function getAddresses(): Promise<AddressDto[]> {
  if (await usingOdoo()) {
    const { listOdooAddresses } = await import("../odoo/addresses");
    return listOdooAddresses();
  }
  const body = await apiGet<AddressListResponse>("/addresses");
  return body.data;
}

export async function createAddress(input: AddressWriteInput): Promise<AddressDto> {
  if (await usingOdoo()) {
    const { createOdooAddress } = await import("../odoo/addresses");
    return createOdooAddress(toOdooAddressInput(input));
  }
  const body = await apiPost<AddressMutationResponse>("/addresses", nestAddress(input));
  return body.data;
}

export async function updateAddress(addressId: string, input: AddressWriteInput): Promise<AddressDto> {
  if (await usingOdoo()) {
    const { updateOdooAddress } = await import("../odoo/addresses");
    const id = parseOdooRecordId(addressId);
    if (!id) {
      const { ApiClientError } = await import("./client");
      throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
    }
    return updateOdooAddress(id, toOdooAddressInput(input));
  }
  const body = await apiPatch<AddressMutationResponse>(`/addresses/${encodeURIComponent(addressId)}`, nestAddress(input));
  return body.data;
}

export async function deleteAddress(addressId: string): Promise<AddressDeleteResponse["data"]> {
  if (await usingOdoo()) {
    const { deleteOdooAddress } = await import("../odoo/addresses");
    const id = parseOdooRecordId(addressId);
    if (!id) {
      const { ApiClientError } = await import("./client");
      throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
    }
    await deleteOdooAddress(id);
    return { id: addressId };
  }
  const body = await apiDelete<AddressDeleteResponse>(`/addresses/${encodeURIComponent(addressId)}`);
  return body.data;
}

export async function setDefaultAddress(addressId: string): Promise<AddressDto> {
  if (await usingOdoo()) {
    const addresses = await getAddresses();
    const found = addresses.find((address) => address.id === addressId);
    if (!found) {
      const { ApiClientError } = await import("./client");
      throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
    }
    return found;
  }
  const body = await apiPost<AddressMutationResponse>(`/addresses/${encodeURIComponent(addressId)}/default`);
  return body.data;
}

function nestAddress(input: AddressWriteInput): AddressWriteRequest {
  return {
    label: input.label,
    recipient: input.recipient,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    region: input.region,
    postalCode: input.postalCode,
    country: input.country,
    isDefault: input.isDefault,
  };
}

function toOdooAddressInput(input: AddressWriteInput) {
  return {
    type: parseAddressType(input.type),
    name: input.recipient,
    street: input.line1,
    street2: input.line2 || undefined,
    city: input.city,
    zip: input.postalCode || undefined,
    phone: input.phone || undefined,
    ...parseCountryInput(input.country ?? "SA", input.countryId),
  };
}

async function usingOdoo() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}
