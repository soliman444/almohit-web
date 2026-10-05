import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBaseCurrencyCode,
  isValidCurrencyCode,
  isValidRateFromUSD,
  normalizeCurrencyCode,
  resolveBaseRate,
} from "./currency-rules";
import { formatCurrencyFromUSD, isSupportedCurrency, parseCurrencyCookie } from "./currency";

describe("currency admin rules", () => {
  it("normalizes and accepts ISO-like codes", () => {
    assert.equal(normalizeCurrencyCode(" gbp "), "GBP");
    assert.equal(isValidCurrencyCode("gbp"), true);
    assert.equal(isValidCurrencyCode("GB"), false);
    assert.equal(isValidCurrencyCode("US1"), false);
  });

  it("rejects zero or empty rates and locks USD to 1", () => {
    assert.equal(isValidRateFromUSD("0.78"), true);
    assert.equal(isValidRateFromUSD("250"), true);
    assert.equal(isValidRateFromUSD("0"), false);
    assert.equal(isValidRateFromUSD("0.00"), false);
    assert.equal(isValidRateFromUSD("-1"), false);
    assert.equal(isBaseCurrencyCode("usd"), true);
    assert.equal(resolveBaseRate("USD", "3.75"), "1");
    assert.equal(resolveBaseRate("GBP", "0.78"), "0.78");
  });
});

describe("admin-added display currencies", () => {
  const catalog = [
    { code: "USD", label: "US Dollar", symbol: "USD", rateFromUSD: "1", locale: "en-US" },
    { code: "GBP", label: "British Pound", symbol: "GBP", rateFromUSD: "0.78", locale: "en-GB" },
  ];

  it("accepts a newly added code and converts with its rate", () => {
    assert.equal(isSupportedCurrency("GBP"), false);
    assert.equal(isSupportedCurrency("GBP", catalog), true);
    assert.equal(parseCurrencyCookie("GBP", catalog), "GBP");
    assert.equal(formatCurrencyFromUSD("100.00", "GBP", catalog), "GBP 78.00");
  });
});
