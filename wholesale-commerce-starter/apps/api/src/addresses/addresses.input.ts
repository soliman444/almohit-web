import { BadRequestException } from "@nestjs/common";
import { INVALID_ADDRESS } from "./addresses.errors";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new BadRequestException(INVALID_ADDRESS);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new BadRequestException(INVALID_ADDRESS);
  return trimmed;
}

function required(value: unknown, min: number, max: number): string {
  if (typeof value !== "string") throw new BadRequestException(INVALID_ADDRESS);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new BadRequestException(INVALID_ADDRESS);
  return trimmed;
}

export type AddressInput = {
  label: string | null;
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

export function parseAddressInput(body: Record<string, unknown> | null | undefined): AddressInput {
  const countryRaw = text(body?.country) || "SA";
  if (countryRaw.length < 2 || countryRaw.length > 80) throw new BadRequestException(INVALID_ADDRESS);
  return {
    label: optional(body?.label, 80),
    recipient: required(body?.recipient, 2, 120),
    phone: optional(body?.phone, 30),
    line1: required(body?.line1, 3, 200),
    line2: optional(body?.line2, 200),
    city: required(body?.city, 2, 120),
    region: optional(body?.region, 120),
    postalCode: optional(body?.postalCode, 20),
    country: countryRaw,
    isDefault: body?.isDefault === true || body?.isDefault === "on" || body?.isDefault === "true",
  };
}
