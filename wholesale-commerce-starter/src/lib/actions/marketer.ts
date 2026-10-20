"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiClientError, ApiUnavailableError } from "../odoo/errors";
import { isOdooAuthError } from "../odoo/auth";
import { createMarketerMerchant } from "../odoo/marketer";
import { requireMarketer } from "../session/access";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export async function createMarketerMerchantAction(formData: FormData) {
  await requireMarketer();
  const parsed = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    companyName: z.string().min(2).max(160),
    taxNumber: z.string().min(3).max(80),
    businessType: z.string().max(120).optional(),
    phone: z.string().max(30).optional(),
    city: z.string().min(2).max(120),
    address: z.string().min(4).max(300),
    managerName: z.string().min(2).max(120),
    employeeName: z.string().max(120).optional(),
    bankAccount: z.string().min(4).max(80),
    paymentMethod: z.enum(["bank_transfer", "cash", "both"]),
    notes: z.string().max(1000).optional(),
  }).safeParse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    password: value(formData, "password"),
    companyName: value(formData, "companyName"),
    taxNumber: value(formData, "taxNumber"),
    businessType: value(formData, "businessType") || undefined,
    phone: value(formData, "phone") || undefined,
    city: value(formData, "city"),
    address: value(formData, "address"),
    managerName: value(formData, "managerName"),
    employeeName: value(formData, "employeeName") || undefined,
    bankAccount: value(formData, "bankAccount"),
    paymentMethod: value(formData, "paymentMethod"),
    notes: value(formData, "notes") || undefined,
  });
  if (!parsed.success) redirect("/account/merchants/new?error=kyc");

  try {
    const image = formData.get("shopImage");
    const { decodeUploadImage } = await import("../odoo/images");
    const shopImage = await decodeUploadImage(image instanceof File ? image : null);
    await createMarketerMerchant({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      companyName: parsed.data.companyName,
      taxNumber: parsed.data.taxNumber,
      businessType: parsed.data.businessType,
      phone: parsed.data.phone,
      street: parsed.data.address,
      city: parsed.data.city,
      managerName: parsed.data.managerName,
      employeeName: parsed.data.employeeName,
      bankAccount: parsed.data.bankAccount,
      paymentMethod: parsed.data.paymentMethod,
      shopImageBase64: shopImage.imageBase64,
      shopImageContentType: shopImage.imageContentType,
      notes: parsed.data.notes,
    });
  } catch (error) {
    if (isOdooAuthError(error, "EMAIL_ALREADY_EXISTS")) redirect("/account/merchants/new?error=exists");
    if (isOdooAuthError(error, "PASSWORD_TOO_SHORT")) redirect("/account/merchants/new?error=password");
    if (isOdooAuthError(error, "INVALID_IMAGE")) redirect("/account/merchants/new?error=image");
    if (isOdooAuthError(error, "INVALID_PAYMENT_METHOD")) redirect("/account/merchants/new?error=payment");
    if (error instanceof ApiClientError && error.status === 401) redirect("/login");
    if (error instanceof ApiUnavailableError) redirect("/account/merchants/new?error=unavailable");
    throw error;
  }
  revalidatePath("/account/merchants");
  redirect("/account/merchants?created=1");
}
