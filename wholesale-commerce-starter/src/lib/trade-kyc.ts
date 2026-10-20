import { z } from "zod";

export const APP_ROLES = ["merchant", "buyer", "distributor", "marketer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type ParsedTradeKyc = {
  businessName: string;
  businessType?: string;
  taxNumber: string;
  city: string;
  address: string;
  managerName: string;
  employeeName?: string;
  bankAccount?: string;
  paymentMethod?: "bank_transfer" | "cash" | "both";
  phone?: string;
  notes?: string;
};

const merchantSchema = z.object({
  businessName: z.string().min(2).max(160),
  businessType: z.string().max(120).optional(),
  taxNumber: z.string().min(3).max(80),
  city: z.string().min(2).max(120),
  address: z.string().min(4).max(300),
  managerName: z.string().min(2).max(120),
  employeeName: z.string().max(120).optional(),
  bankAccount: z.string().min(4).max(80),
  paymentMethod: z.enum(["bank_transfer", "cash", "both"]),
  phone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
});

const officeSchema = z.object({
  businessName: z.string().min(2).max(160),
  businessType: z.string().min(2).max(120),
  taxNumber: z.string().min(3).max(80),
  city: z.string().min(2).max(120),
  address: z.string().min(4).max(300),
  managerName: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
});

export function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function parseAppRole(value: string): AppRole {
  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : "merchant";
}

export function parseTradeKyc(
  formData: FormData,
  role: AppRole,
): { success: true; data: ParsedTradeKyc } | { success: false } {
  if (role === "merchant") {
    const parsed = merchantSchema.safeParse({
      businessName: formValue(formData, "businessName"),
      businessType: formValue(formData, "businessType") || undefined,
      taxNumber: formValue(formData, "taxNumber"),
      city: formValue(formData, "city"),
      address: formValue(formData, "address"),
      managerName: formValue(formData, "managerName"),
      employeeName: formValue(formData, "employeeName") || undefined,
      bankAccount: formValue(formData, "bankAccount"),
      paymentMethod: formValue(formData, "paymentMethod"),
      phone: formValue(formData, "phone") || undefined,
      notes: formValue(formData, "notes") || undefined,
    });
    return parsed.success ? { success: true, data: parsed.data } : { success: false };
  }

  const parsed = officeSchema.safeParse({
    businessName: formValue(formData, "businessName"),
    businessType: formValue(formData, "businessType"),
    taxNumber: formValue(formData, "taxNumber"),
    city: formValue(formData, "city"),
    address: formValue(formData, "address"),
    managerName: formValue(formData, "managerName"),
    phone: formValue(formData, "phone") || undefined,
    notes: formValue(formData, "notes") || undefined,
  });
  return parsed.success ? { success: true, data: parsed.data } : { success: false };
}

export function tradeApplicationFromKyc(role: AppRole, input: ParsedTradeKyc) {
  return {
    companyName: input.businessName,
    role,
    taxNumber: input.taxNumber,
    businessType: input.businessType,
    phone: input.phone,
    street: input.address,
    city: input.city,
    managerName: input.managerName,
    employeeName: input.employeeName,
    bankAccount: input.bankAccount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
  };
}
