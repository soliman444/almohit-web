import { odooRequest } from "./client";
import type { DisplayCurrencyConfig } from "../../config/currencies";
import type { OdooCookieAdapter } from "./types";

export type OdooDisplayCurrencyPayload = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
  rate_from_company: number;
  is_company: boolean;
};

export type OdooCurrencyCatalogPayload = {
  company_currency: string;
  date?: string;
  currencies: OdooDisplayCurrencyPayload[];
};

export type OdooCurrencyCatalog = {
  companyCurrency: string;
  date: string | null;
  currencies: DisplayCurrencyConfig[];
};

const LOCALE_BY_CODE: Record<string, string> = {
  USD: "en-US",
  SAR: "ar-SA",
  AED: "ar-AE",
  YER: "ar-YE",
  EUR: "de-DE",
  GBP: "en-GB",
};

export function mapOdooDisplayCurrency(payload: OdooDisplayCurrencyPayload): DisplayCurrencyConfig {
  const code = String(payload.code || "").toUpperCase();
  const rate = typeof payload.rate_from_company === "number" && Number.isFinite(payload.rate_from_company)
    ? payload.rate_from_company
    : 0;
  return {
    code,
    label: payload.name || code,
    symbol: payload.symbol || code,
    rateFromCompany: rate.toFixed(8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""),
    locale: LOCALE_BY_CODE[code] || "en-US",
    isCompany: Boolean(payload.is_company),
  };
}

export function mapOdooCurrencyCatalog(payload: OdooCurrencyCatalogPayload): OdooCurrencyCatalog {
  return {
    companyCurrency: String(payload.company_currency || "").toUpperCase(),
    date: payload.date ? String(payload.date) : null,
    currencies: (payload.currencies ?? []).map(mapOdooDisplayCurrency),
  };
}

export async function listOdooCurrencies(cookies?: OdooCookieAdapter): Promise<OdooCurrencyCatalog> {
  const payload = await odooRequest<OdooCurrencyCatalogPayload>("/currencies", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return mapOdooCurrencyCatalog(payload);
}
