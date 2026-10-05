import {
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  DISPLAY_CURRENCY_CODES,
  type DisplayCurrencyCode,
  type DisplayCurrencyConfig,
} from "../config/currencies";

export type { DisplayCurrencyCode };

export type DisplayMoneyInput = string | number | { toString(): string };

export type CurrencyCatalog = DisplayCurrencyConfig[];

const FALLBACK_CATALOG: CurrencyCatalog = DISPLAY_CURRENCY_CODES.map((code) => DISPLAY_CURRENCIES[code]);

export function catalogOrFallback(catalog?: CurrencyCatalog | null): CurrencyCatalog {
  return catalog?.length ? catalog : FALLBACK_CATALOG;
}

export function isSupportedCurrency(value: string | null | undefined, catalog?: CurrencyCatalog | null): value is DisplayCurrencyCode {
  if (!value) return false;
  return catalogOrFallback(catalog).some((item) => item.code === value);
}

export function parseCurrencyCookie(value: string | null | undefined, catalog?: CurrencyCatalog | null): DisplayCurrencyCode {
  return isSupportedCurrency(value, catalog) ? value : DEFAULT_DISPLAY_CURRENCY;
}

export function getCurrencyConfig(code: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const list = catalogOrFallback(catalog);
  const next = parseCurrencyCookie(code, list);
  return list.find((item) => item.code === next) ?? DISPLAY_CURRENCIES[DEFAULT_DISPLAY_CURRENCY];
}

export function convertFromUSD(amountUsd: DisplayMoneyInput, currencyCode: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const config = getCurrencyConfig(currencyCode, catalog);
  return multiplyDecimals(decimalText(amountUsd), config.rateFromUSD);
}

export function formatCurrencyFromUSD(amountUsd: DisplayMoneyInput, currencyCode: string | null | undefined, catalog?: CurrencyCatalog | null) {
  const config = getCurrencyConfig(currencyCode, catalog);
  return `${config.symbol} ${convertFromUSD(amountUsd, config.code, catalog)}`;
}

export function formatUsdBase(amountUsd: DisplayMoneyInput) {
  return `USD ${decimalText(amountUsd, 2)}`;
}

export const formatMoney = formatCurrencyFromUSD;

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

function formatScaled(value: bigint, scale: number, decimals: number) {
  const negative = value < 0n;
  let abs = negative ? -value : value;
  let nextScale = scale;

  if (nextScale < decimals) {
    abs *= 10n ** BigInt(decimals - nextScale);
    nextScale = decimals;
  } else if (nextScale > decimals) {
    const factor = 10n ** BigInt(nextScale - decimals);
    const remainder = abs % factor;
    abs /= factor;
    if (remainder * 2n >= factor) abs += 1n;
    nextScale = decimals;
  }

  const padded = abs.toString().padStart(nextScale + 1, "0");
  return `${negative ? "-" : ""}${padded.slice(0, -nextScale)}.${padded.slice(-nextScale)}`;
}
