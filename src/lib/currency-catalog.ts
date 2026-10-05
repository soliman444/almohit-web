import { cache } from "react";
import { DISPLAY_CURRENCY_LIST, type DisplayCurrencyConfig } from "../config/currencies";
import { prisma } from "./db/prisma";

export function currencyFromRecord(row: {
  code: string;
  label: string;
  symbol: string;
  rateFromUsd: { toString(): string };
  locale: string;
}): DisplayCurrencyConfig {
  return {
    code: row.code,
    label: row.label,
    symbol: row.symbol,
    rateFromUSD: trimRate(row.rateFromUsd.toString()),
    locale: row.locale,
  };
}

export const listActiveDisplayCurrencies = cache(async (): Promise<DisplayCurrencyConfig[]> => {
  const rows = await prisma.displayCurrency.findMany({
    where: { status: true },
    orderBy: [{ isBase: "desc" }, { sortOrder: "asc" }, { code: "asc" }],
  });
  return rows.length ? rows.map(currencyFromRecord) : DISPLAY_CURRENCY_LIST;
});

export async function listManagedDisplayCurrencies() {
  return prisma.displayCurrency.findMany({
    orderBy: [{ isBase: "desc" }, { sortOrder: "asc" }, { code: "asc" }],
  });
}

function trimRate(value: string) {
  if (!value.includes(".")) return value;
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
