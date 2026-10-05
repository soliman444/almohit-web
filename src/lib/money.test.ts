import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lineTotal, money, moneySum, moneyText, moneyZero } from "./money";

describe("money helpers", () => {
  it("keeps two-decimal totals without float addition", () => {
    const total = moneySum(["10.10", "20.20", "0.05"]);
    assert.equal(moneyText(total), "30.35");
  });

  it("multiplies unit price by integer quantity with Decimal", () => {
    assert.equal(moneyText(lineTotal("12.50", 3)), "37.50");
  });

  it("does not start from a floating zero", () => {
    assert.equal(moneyText(moneyZero().add(money("0.10")).add(money("0.20"))), "0.30");
  });
});
