import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommerceError, commerceMessage } from "./commerce-errors";
import {
  allowedOrderTransitions,
  applyFulfillStock,
  applyReleaseStock,
  applyReserveStock,
  assertOrderTransition,
  assertPaymentAmount,
  canReserveStock,
  cartItemIssue,
  nextOrderNumber,
  paidTotalFromPayments,
  paymentStatusFromPaid,
  remainingPayable,
  resolveLockedCartCheckout,
  sameCartSku,
} from "./commerce-rules";
import { money } from "./money";
import { canSeeProductPrices } from "./price-auth";

function buyer(status: string, priceGroupId: string | null, groupStatus = "ACTIVE") {
  return {
    customer: {
      businessStatus: status,
      priceGroupId,
      priceGroup: priceGroupId ? { status: groupStatus } : null,
    },
  };
}

describe("price authorization", () => {
  it("hides prices from visitors and unapproved customers", () => {
    assert.equal(canSeeProductPrices(null), false);
    assert.equal(canSeeProductPrices({ customer: null }), false);
    assert.equal(canSeeProductPrices(buyer("NORMAL", "g1")), false);
    assert.equal(canSeeProductPrices(buyer("PENDING", "g1")), false);
    assert.equal(canSeeProductPrices(buyer("REJECTED", "g1")), false);
    assert.equal(canSeeProductPrices(buyer("APPROVED", null)), false);
    assert.equal(canSeeProductPrices(buyer("APPROVED", "g1", "INACTIVE")), false);
  });

  it("allows prices only for approved customers with an active price group", () => {
    assert.equal(canSeeProductPrices(buyer("APPROVED", "g1")), true);
  });
});

describe("MOQ and cart item validation", () => {
  it("rejects quantities below the current minimum", () => {
    assert.equal(
      cartItemIssue({
        productActive: true,
        categoryActive: true,
        quantity: 2,
        minOrderQuantity: 5,
        available: 20,
        hasPrice: true,
      }),
      "MINIMUM",
    );
  });

  it("rejects unavailable or unpriced items", () => {
    assert.equal(
      cartItemIssue({
        productActive: false,
        categoryActive: true,
        quantity: 5,
        minOrderQuantity: 1,
        available: 10,
        hasPrice: true,
      }),
      "UNAVAILABLE",
    );
    assert.equal(
      cartItemIssue({
        productActive: true,
        categoryActive: true,
        quantity: 5,
        minOrderQuantity: 1,
        available: 10,
        hasPrice: false,
      }),
      "PRICE",
    );
  });
});

describe("stock reservation", () => {
  it("allows reserve only when available stock covers the request", () => {
    assert.equal(canReserveStock(10, 8, 2), true);
    assert.equal(canReserveStock(10, 8, 3), false);
    assert.deepEqual(applyReserveStock(10, 8, 2), { quantity: 10, reservedQuantity: 10 });
    assert.throws(() => applyReserveStock(10, 8, 3), CommerceError);
  });

  it("releases reserved stock exactly and never below zero", () => {
    assert.deepEqual(applyReleaseStock(10, 4, 4), { quantity: 10, reservedQuantity: 0 });
    assert.throws(() => applyReleaseStock(10, 3, 4), CommerceError);
  });

  it("deducts delivered stock and reservation together", () => {
    assert.deepEqual(applyFulfillStock(10, 4, 4), { quantity: 6, reservedQuantity: 0 });
    assert.throws(() => applyFulfillStock(3, 4, 4), CommerceError);
    assert.throws(() => applyFulfillStock(10, 3, 4), CommerceError);
  });
});

describe("status transitions", () => {
  it("allows only the next status or cancel before delivery", () => {
    assert.deepEqual(allowedOrderTransitions("PENDING"), ["CONFIRMED", "CANCELLED"]);
    assert.deepEqual(allowedOrderTransitions("SHIPPED"), ["DELIVERED", "CANCELLED"]);
    assert.deepEqual(allowedOrderTransitions("DELIVERED"), []);
    assert.deepEqual(allowedOrderTransitions("CANCELLED"), []);
    assert.throws(() => assertOrderTransition("PENDING", "SHIPPED"), CommerceError);
    assert.throws(() => assertOrderTransition("DELIVERED", "CANCELLED"), CommerceError);
    assert.throws(() => assertOrderTransition("CANCELLED", "PENDING"), CommerceError);
  });
});

describe("payment status calculation", () => {
  it("counts only PAID records with Decimal math", () => {
    const paid = paidTotalFromPayments([
      { status: "PENDING", amount: "40.00" },
      { status: "PAID", amount: "10.25" },
      { status: "PAID", amount: "5.15" },
      { status: "FAILED", amount: "99.00" },
    ]);
    assert.equal(paid.toFixed(2), "15.40");
    assert.equal(paymentStatusFromPaid(0, "20.00"), "PENDING");
    assert.equal(paymentStatusFromPaid("10.00", "20.00"), "PARTIAL");
    assert.equal(paymentStatusFromPaid("20.00", "20.00"), "PAID");
    assert.equal(remainingPayable("15.40", "20.00").toFixed(2), "4.60");
  });

  it("rejects zero, negative, and overpay amounts", () => {
    assert.throws(() => assertPaymentAmount("0", "0", "10"), CommerceError);
    assert.throws(() => assertPaymentAmount("-1", "0", "10"), CommerceError);
    assert.throws(() => assertPaymentAmount("10.01", "0", "10.00"), CommerceError);
    assert.equal(assertPaymentAmount("4.60", "15.40", "20.00").toFixed(2), "4.60");
  });
});

describe("duplicate checkout protection", () => {
  it("returns the existing order when the same cart is already converted", () => {
    assert.deepEqual(
      resolveLockedCartCheckout({ status: "CONVERTED", order: { orderNumber: "ORD-1" } }),
      { type: "existing", orderNumber: "ORD-1" },
    );
    assert.deepEqual(resolveLockedCartCheckout({ status: "ACTIVE" }), { type: "proceed" });
    assert.deepEqual(resolveLockedCartCheckout({ status: "ABANDONED" }), { type: "invalid" });
  });

  it("treats the same product and variant as one cart SKU", () => {
    assert.equal(sameCartSku({ productId: "p1", variantId: null }, { productId: "p1" }), true);
    assert.equal(sameCartSku({ productId: "p1", variantId: "v1" }, { productId: "p1", variantId: null }), false);
  });

  it("generates collision-resistant order numbers", () => {
    const numbers = new Set(Array.from({ length: 50 }, () => nextOrderNumber()));
    assert.equal(numbers.size, 50);
    for (const value of numbers) assert.match(value, /^ORD-[0-9A-F]{16}$/);
  });
});

describe("user-safe errors", () => {
  it("never surfaces Prisma text", () => {
    assert.equal(commerceMessage(new Error("Invalid `prisma.order.create()`")), "The cart could not be updated.");
    assert.equal(commerceMessage(new CommerceError("STOCK")), "Stock changed. Reduce the quantity and try again.");
    assert.equal(commerceMessage(new CommerceError("TRANSITION")), "That order status change is not allowed.");
  });
});

describe("money used by payment rules", () => {
  it("compares Decimal totals instead of floats", () => {
    assert.equal(paymentStatusFromPaid(money("10.10"), money("10.10")), "PAID");
    assert.equal(paymentStatusFromPaid(money("10.09"), money("10.10")), "PARTIAL");
  });
});
