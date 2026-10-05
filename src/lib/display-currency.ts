import { cookies } from "next/headers";
import { CURRENCY_COOKIE, DEFAULT_DISPLAY_CURRENCY } from "../config/currencies";
import { listActiveDisplayCurrencies } from "./currency-catalog";
import { parseCurrencyCookie, type DisplayCurrencyCode } from "./currency";

export async function getDisplayCurrencyState() {
  const [jar, catalog] = await Promise.all([cookies(), listActiveDisplayCurrencies()]);
  const code = parseCurrencyCookie(jar.get(CURRENCY_COOKIE)?.value ?? DEFAULT_DISPLAY_CURRENCY, catalog);
  return { code, catalog };
}

export async function getDisplayCurrency(): Promise<DisplayCurrencyCode> {
  return (await getDisplayCurrencyState()).code;
}
