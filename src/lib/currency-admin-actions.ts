"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "../../generated/prisma/client";
import { z } from "zod";
import { requirePermission } from "./auth";
import { prisma } from "./db/prisma";
import { isBaseCurrencyCode, isValidCurrencyCode, isValidRateFromUSD, normalizeCurrencyCode, resolveBaseRate } from "./currency-rules";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

const currencyInput = z.object({
  code: z.string().transform(normalizeCurrencyCode).refine(isValidCurrencyCode),
  label: z.string().min(2).max(80),
  symbol: z.string().min(1).max(12),
  rateFromUsd: z.string().refine(isValidRateFromUSD),
  locale: z.string().min(2).max(16),
  sortOrder: z.coerce.number().int().min(0).max(999),
  status: z.boolean(),
});

function fail(code: string): never {
  redirect(`/admin/currencies?error=${code}`);
}

function refreshCurrencies(path = "/admin/currencies") {
  revalidatePath("/", "layout");
  revalidatePath("/admin/currencies");
  revalidatePath(path);
}

async function writeAudit(
  userId: string,
  action: string,
  entityId: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType: "DisplayCurrency",
      entityId,
      oldData: oldData ? (oldData as Prisma.InputJsonValue) : undefined,
      newData: newData ? (newData as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function createDisplayCurrencyAction(formData: FormData) {
  const admin = await requirePermission("currency.create");
  const parsed = currencyInput.safeParse({
    code: value(formData, "code"),
    label: value(formData, "label"),
    symbol: value(formData, "symbol") || value(formData, "code"),
    rateFromUsd: value(formData, "rateFromUsd"),
    locale: value(formData, "locale") || "en-US",
    sortOrder: value(formData, "sortOrder") || "0",
    status: formData.get("status") === "on",
  });
  if (!parsed.success) fail("invalid");

  const input = parsed.data;
  if (isBaseCurrencyCode(input.code)) fail("base");

  const exists = await prisma.displayCurrency.findUnique({ where: { code: input.code } });
  if (exists) fail("exists");

  const currency = await prisma.displayCurrency.create({
    data: {
      code: input.code,
      label: input.label,
      symbol: input.symbol,
      rateFromUsd: input.rateFromUsd,
      locale: input.locale,
      sortOrder: input.sortOrder,
      status: input.status,
      isBase: false,
    },
  });
  await writeAudit(admin.id, "CURRENCY_CREATED", currency.id, undefined, {
    code: currency.code,
    rateFromUsd: input.rateFromUsd,
  });
  refreshCurrencies();
  redirect("/admin/currencies?notice=created");
}

export async function updateDisplayCurrencyAction(formData: FormData) {
  const admin = await requirePermission("currency.update");
  const id = value(formData, "id");
  const current = await prisma.displayCurrency.findUnique({ where: { id } });
  if (!current) fail("missing");

  const parsed = currencyInput.safeParse({
    code: current.isBase ? current.code : value(formData, "code") || current.code,
    label: value(formData, "label") || current.label,
    symbol: value(formData, "symbol") || current.symbol,
    rateFromUsd: resolveBaseRate(current.code, value(formData, "rateFromUsd") || current.rateFromUsd.toString()),
    locale: value(formData, "locale") || current.locale,
    sortOrder: value(formData, "sortOrder") || String(current.sortOrder),
    status: current.isBase ? true : formData.get("status") === "on",
  });
  if (!parsed.success) fail("invalid");

  const input = parsed.data;
  if (current.isBase && (input.code !== current.code || !input.status || input.rateFromUsd !== "1")) fail("base");

  if (input.code !== current.code) {
    const clash = await prisma.displayCurrency.findUnique({ where: { code: input.code } });
    if (clash) fail("exists");
  }

  await prisma.displayCurrency.update({
    where: { id },
    data: {
      code: input.code,
      label: input.label,
      symbol: input.symbol,
      rateFromUsd: input.rateFromUsd,
      locale: input.locale,
      sortOrder: input.sortOrder,
      status: input.status,
    },
  });
  await writeAudit(
    admin.id,
    "CURRENCY_UPDATED",
    id,
    { code: current.code, rateFromUsd: current.rateFromUsd.toString(), status: current.status },
    { code: input.code, rateFromUsd: input.rateFromUsd, status: input.status },
  );
  refreshCurrencies(`/admin/currencies?edit=${id}`);
  redirect(`/admin/currencies?edit=${id}&notice=updated`);
}

export async function deleteDisplayCurrencyAction(formData: FormData) {
  const admin = await requirePermission("currency.delete");
  const id = value(formData, "id");
  const current = await prisma.displayCurrency.findUnique({ where: { id } });
  if (!current) fail("missing");
  if (current.isBase || isBaseCurrencyCode(current.code)) fail("base");

  await prisma.displayCurrency.delete({ where: { id } });
  await writeAudit(admin.id, "CURRENCY_DELETED", id, { code: current.code });
  refreshCurrencies();
  redirect("/admin/currencies?notice=deleted");
}
