export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
export const CURRENCY_RATE_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidCurrencyCode(value: string) {
  return CURRENCY_CODE_PATTERN.test(normalizeCurrencyCode(value));
}

export function isValidRateFromUSD(value: string) {
  const text = value.trim();
  if (!CURRENCY_RATE_PATTERN.test(text)) return false;
  const [whole, frac = ""] = text.split(".");
  const digits = `${whole}${frac}`.replace(/^0+/, "") || "0";
  return digits !== "0";
}

export function isBaseCurrencyCode(code: string) {
  return normalizeCurrencyCode(code) === "USD";
}

export function resolveBaseRate(code: string, rate: string) {
  return isBaseCurrencyCode(code) ? "1" : rate.trim();
}
