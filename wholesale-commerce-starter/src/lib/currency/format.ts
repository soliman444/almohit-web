import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";

export type { DisplayCurrencyCode };

export type DisplayMoneyInput = string | number | { toString(): string };

export type CurrencyCatalog = DisplayCurrencyConfig[];

export function catalogOrFallback(catalog?: CurrencyCatalog | null): CurrencyCatalog {
  return catalog?.length ? catalog : [];
}

export function companyCurrencyCode(catalog?: CurrencyCatalog | null): string {
  const list = catalogOrFallback(catalog);
  return list.find((item) => item.isCompany)?.code || list[0]?.code || "";
}

export function isSupportedCurrency(value: string | null | undefined, catalog?: CurrencyCatalog | null): value is DisplayCurrencyCode {
  if (!value) return false;
  return catalogOrFallback(catalog).some((item) => item.code === value);
}

export function parseCurrencyCookie(value: string | null | undefined, catalog?: CurrencyCatalog | null): DisplayCurrencyCode {
  const list = catalogOrFallback(catalog);
  if (isSupportedCurrency(value, list)) return value;
  return companyCurrencyCode(list);
}

export function getCurrencyConfig(code: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const list = catalogOrFallback(catalog);
  const next = parseCurrencyCookie(code, list);
  return list.find((item) => item.code === next) ?? {
    code: next || "USD",
    label: next || "USD",
    symbol: next || "USD",
    rateFromCompany: "1",
    locale: "en-US",
    isCompany: true,
  };
}

export function convertFromCompany(amount: DisplayMoneyInput, currencyCode: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const config = getCurrencyConfig(currencyCode, catalog);
  return multiplyDecimals(decimalText(amount), config.rateFromCompany);
}

export function formatDisplayMoney(amount: DisplayMoneyInput, currencyCode: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const config = getCurrencyConfig(currencyCode, catalog);
  return `${config.symbol} ${convertFromCompany(amount, config.code, catalog)}`;
}

export function formatCompanyBase(amount: DisplayMoneyInput, catalog?: CurrencyCatalog | null) {
  const code = companyCurrencyCode(catalog) || "USD";
  return `${code} ${decimalText(amount, 2)}`;
}

function decimalText(value: DisplayMoneyInput, decimals?: number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("AMOUNT");
    const scaled = parseScaled(value.toFixed(8));
    return decimals === undefined ? value.toFixed(2) : formatScaled(scaled.digits, scaled.scale, decimals);
  }
  const text = (typeof value === "object" ? value.toString() : String(value)).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error("AMOUNT");
  if (decimals === undefined) return text;
  const scaled = parseScaled(text);
  return formatScaled(scaled.digits, scaled.scale, decimals);
}

function parseScaled(value: string) {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, frac = ""] = unsigned.split(".");
  return {
    digits: BigInt(`${negative ? "-" : ""}${whole}${frac}` || "0"),
    scale: frac.length,
  };
}

function multiplyDecimals(left: string, right: string, decimals = 2) {
  const a = parseScaled(left);
  const b = parseScaled(right);
  return formatScaled(a.digits * b.digits, a.scale + b.scale, decimals);
}

function formatScaled(digits: bigint, scale: number, decimals: number) {
  const negative = digits < 0n;
  const abs = negative ? -digits : digits;
  const extra = scale - decimals;
  let rounded = abs;
  if (extra > 0) {
    const divisor = 10n ** BigInt(extra);
    const remainder = abs % divisor;
    rounded = abs / divisor;
    if (remainder * 2n >= divisor) rounded += 1n;
  } else if (extra < 0) {
    rounded = abs * (10n ** BigInt(-extra));
  }
  const padded = rounded.toString().padStart(decimals + 1, "0");
  const split = padded.length - decimals;
  const whole = padded.slice(0, split);
  const frac = padded.slice(split);
  return `${negative ? "-" : ""}${whole}${decimals ? `.${frac}` : ""}`;
}
