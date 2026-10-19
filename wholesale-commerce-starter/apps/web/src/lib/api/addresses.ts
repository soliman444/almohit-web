import type {
  AddressDeleteResponse,
  AddressDto,
  AddressWriteRequest,
} from "@almohit/contracts";
import { parseOdooRecordId } from "../odoo/catalog";
import { parseAddressType, parseCountryInput } from "../odoo/addresses";
import { ApiClientError } from "./client";

export type AddressWriteInput = AddressWriteRequest & {
  type?: string;
  countryId?: string | null;
};

export async function getAddresses(): Promise<AddressDto[]> {
  await requireOdoo();
  const { listOdooAddresses } = await import("../odoo/addresses");
  return listOdooAddresses();
}

export async function createAddress(input: AddressWriteInput): Promise<AddressDto> {
  await requireOdoo();
  const { createOdooAddress } = await import("../odoo/addresses");
  return createOdooAddress(toOdooAddressInput(input));
}

export async function updateAddress(addressId: string, input: AddressWriteInput): Promise<AddressDto> {
  await requireOdoo();
  const { updateOdooAddress } = await import("../odoo/addresses");
  const id = parseOdooRecordId(addressId);
  if (!id) {
    throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  }
  return updateOdooAddress(id, toOdooAddressInput(input));
}

export async function deleteAddress(addressId: string): Promise<AddressDeleteResponse["data"]> {
  await requireOdoo();
  const { deleteOdooAddress } = await import("../odoo/addresses");
  const id = parseOdooRecordId(addressId);
  if (!id) {
    throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  }
  await deleteOdooAddress(id);
  return { id: addressId };
}

export async function setDefaultAddress(addressId: string): Promise<AddressDto> {
  const addresses = await getAddresses();
  const found = addresses.find((address) => address.id === addressId);
  if (!found) {
    throw new ApiClientError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  }
  return found;
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

async function requireOdoo() {
  const odoo = await import("../odoo/auth");
  if (!(await odoo.hasOdooSession())) {
    throw new ApiClientError(401, "AUTH_REQUIRED", "Sign in required.");
  }
}
