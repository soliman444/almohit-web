export const CURRENCY_COOKIE = "almohit_currency";

export type DisplayCurrencyCode = string;

export type DisplayCurrencyConfig = {
  code: string;
  label: string;
  symbol: string;
  rateFromCompany: string;
  locale: string;
  isCompany?: boolean;
};

export const EMPTY_CURRENCY_CATALOG: DisplayCurrencyConfig[] = [];
