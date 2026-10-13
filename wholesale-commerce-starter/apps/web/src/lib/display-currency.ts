import { cookies } from "next/headers";
import { CURRENCY_COOKIE } from "../config/currencies";
import { getOdooCurrencyCatalog } from "./currency-catalog";
import { parseCurrencyCookie, type DisplayCurrencyCode } from "./currency";

export async function getDisplayCurrencyState() {
  const [jar, payload] = await Promise.all([cookies(), getOdooCurrencyCatalog()]);
  const code = parseCurrencyCookie(jar.get(CURRENCY_COOKIE)?.value, payload.currencies);
  return {
    code,
    catalog: payload.currencies,
    companyCurrency: payload.companyCurrency || payload.currencies.find((item) => item.isCompany)?.code || "",
    rateDate: payload.date,
  };
}

export async function getDisplayCurrency(): Promise<DisplayCurrencyCode> {
  return (await getDisplayCurrencyState()).code;
}
