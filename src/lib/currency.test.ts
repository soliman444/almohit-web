import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DISPLAY_CURRENCY } from "../config/currencies";
import { canSeeProductPrices } from "./price-auth";
import {
  convertFromUSD,
  formatCurrencyFromUSD,
  formatUsdBase,
  getCurrencyConfig,
  isSupportedCurrency,
  parseCurrencyCookie,
} from "./currency";

describe("display currency defaults", () => {
  it("defaults to USD", () => {
    assert.equal(DEFAULT_DISPLAY_CURRENCY, "USD");
    assert.equal(parseCurrencyCookie(undefined), "USD");
    assert.equal(parseCurrencyCookie(null), "USD");
    assert.equal(parseCurrencyCookie(""), "USD");
    assert.equal(formatCurrencyFromUSD("100.00", "USD"), "USD 100.00");
  });
});

describe("USD conversion", () => {
  it("converts USD to SAR with the centralized rate", () => {
    assert.equal(convertFromUSD("100.00", "SAR"), "375.00");
    assert.equal(formatCurrencyFromUSD("100.00", "SAR"), "SAR 375.00");
  });

  it("converts USD to AED with the centralized rate", () => {
    assert.equal(convertFromUSD("100.00", "AED"), "367.25");
    assert.equal(formatCurrencyFromUSD("100.00", "AED"), "AED 367.25");
  });
});

describe("currency cookie validation", () => {
  it("accepts supported codes and falls unsupported values back to USD", () => {
    assert.equal(isSupportedCurrency("USD"), true);
    assert.equal(isSupportedCurrency("SAR"), true);
    assert.equal(isSupportedCurrency("GBP"), false);
    assert.equal(parseCurrencyCookie("YER"), "YER");
    assert.equal(parseCurrencyCookie("gbp"), "USD");
    assert.equal(parseCurrencyCookie("USD;"), "USD");
    assert.equal(getCurrencyConfig("NOPE").code, "USD");
  });
});

describe("unauthorized price hiding remains intact", () => {
  it("does not invent a price payload for visitors or unapproved customers", () => {
    const hidden = canSeeProductPrices(null) ? formatCurrencyFromUSD("100.00", "SAR") : null;
    assert.equal(hidden, null);
    assert.equal(canSeeProductPrices({ customer: { businessStatus: "PENDING", priceGroupId: "g1", priceGroup: { status: "ACTIVE" } } }), false);
    assert.equal(canSeeProductPrices({ customer: { businessStatus: "APPROVED", priceGroupId: "g1", priceGroup: { status: "ACTIVE" } } }), true);
  });
});

describe("stored money stays USD", () => {
  it("does not change a cart unit price when formatting for display", () => {
    const storedUnitPrice = "100.00";
    const display = formatCurrencyFromUSD(storedUnitPrice, "SAR");
    assert.equal(storedUnitPrice, "100.00");
    assert.equal(display, "SAR 375.00");
    assert.equal(formatUsdBase(storedUnitPrice), "USD 100.00");
  });

  it("does not rewrite order totals when converting for display", () => {
    const orderTotalUsd = "250.00";
    assert.equal(formatCurrencyFromUSD(orderTotalUsd, "AED"), "AED 918.13");
    assert.equal(orderTotalUsd, "250.00");
    assert.equal(formatUsdBase(orderTotalUsd), "USD 250.00");
  });
});
