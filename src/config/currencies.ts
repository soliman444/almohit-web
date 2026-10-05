export const CURRENCY_COOKIE = "almohit_currency";
export const DEFAULT_DISPLAY_CURRENCY = "USD" as const;

export const DISPLAY_CURRENCY_CODES = ["USD", "SAR", "AED", "YER", "EUR"] as const;
export type DisplayCurrencyCode = string;

export type DisplayCurrencyConfig = {
  code: string;
  label: string;
  symbol: string;
  rateFromUSD: string;
  locale: string;
};

/**
 * Fallback display rates used by tests and if the database catalog is empty.
 * Admin-managed rates in display_currencies override this on the storefront.
 */
export const DISPLAY_RATES_FROM_USD: Record<DisplayCurrencyCode, string> = {
  USD: "1",
  SAR: "3.75",
  AED: "3.6725",
  YER: "250",
  EUR: "0.92",
};

export const DISPLAY_CURRENCIES: Record<DisplayCurrencyCode, DisplayCurrencyConfig> = {
  USD: { code: "USD", label: "US Dollar", symbol: "USD", rateFromUSD: DISPLAY_RATES_FROM_USD.USD, locale: "en-US" },
  SAR: { code: "SAR", label: "Saudi Riyal", symbol: "SAR", rateFromUSD: DISPLAY_RATES_FROM_USD.SAR, locale: "ar-SA" },
  AED: { code: "AED", label: "UAE Dirham", symbol: "AED", rateFromUSD: DISPLAY_RATES_FROM_USD.AED, locale: "ar-AE" },
  YER: { code: "YER", label: "Yemeni Rial", symbol: "YER", rateFromUSD: DISPLAY_RATES_FROM_USD.YER, locale: "ar-YE" },
  EUR: { code: "EUR", label: "Euro", symbol: "EUR", rateFromUSD: DISPLAY_RATES_FROM_USD.EUR, locale: "de-DE" },
};

export const DISPLAY_CURRENCY_LIST = DISPLAY_CURRENCY_CODES.map((code) => DISPLAY_CURRENCIES[code]);
