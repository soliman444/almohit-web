import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommerceError } from "./commerce-errors";
import {
  applyFulfillStock,
  applyReleaseStock,
  applyReserveStock,
} from "./commerce-rules";
import { canSeeProductPrices } from "./price-auth";
import {
  assertPurchasableSelection,
  assertVariableCanActivate,
  attributeSnapshot,
  authorizedVariantForBuyer,
  cartesianCombinations,
  combinationKey,
  payloadHasPriceLeak,
  publicVariantForVisitor,
  sameCartSku,
  variantDisplayName,
  variantKey,
} from "./variant-rules";

describe("simple product purchase", () => {
  it("allows a simple product with no variant id", () => {
    assert.doesNotThrow(() =>
      assertPurchasableSelection({ productType: "SIMPLE", productId: "p1", variantId: null }),
    );
  });

  it("rejects a simple product sent with a variant id", () => {
    assert.throws(
      () => assertPurchasableSelection({ productType: "SIMPLE", productId: "p1", variantId: "v1" }),
      CommerceError,
    );
  });
});

describe("variable product requires a valid variant", () => {
  it("requires a variant", () => {
    assert.throws(
      () => assertPurchasableSelection({ productType: "VARIABLE", productId: "p1" }),
      CommerceError,
    );
  });

  it("rejects a variant from another product", () => {
    assert.throws(
      () =>
        assertPurchasableSelection({
          productType: "VARIABLE",
          productId: "p1",
          variantId: "v1",
          variantProductId: "p2",
          variantStatus: "ACTIVE",
        }),
      CommerceError,
    );
  });

  it("rejects a disabled variant", () => {
    assert.throws(
      () =>
        assertPurchasableSelection({
          productType: "VARIABLE",
          productId: "p1",
          variantId: "v1",
          variantProductId: "p1",
          variantStatus: "INACTIVE",
        }),
      CommerceError,
    );
  });

  it("accepts an active variant that belongs to the product", () => {
    assert.doesNotThrow(() =>
      assertPurchasableSelection({
        productType: "VARIABLE",
        productId: "p1",
        variantId: "v1",
        variantProductId: "p1",
        variantStatus: "ACTIVE",
      }),
    );
  });

  it("blocks activating a variable product with no variants", () => {
    assert.throws(() => assertVariableCanActivate(0), CommerceError);
    assert.doesNotThrow(() => assertVariableCanActivate(1));
  });
});

describe("cart identity", () => {
  it("keeps different variants of the same product on separate lines", () => {
    assert.equal(
      sameCartSku({ productId: "p1", variantId: "black-m" }, { productId: "p1", variantId: "black-l" }),
      false,
    );
  });

  it("treats the same variant as one line", () => {
    assert.equal(
      sameCartSku({ productId: "p1", variantId: "black-m" }, { productId: "p1", variantId: "black-m" }),
      true,
    );
    assert.equal(variantKey(null), "");
    assert.equal(variantKey("v1"), "v1");
  });
});

describe("variant combinations and snapshots", () => {
  it("makes combinations unique per product", () => {
    assert.equal(combinationKey(["size-m", "color-black"]), combinationKey(["color-black", "size-m"]));
    assert.notEqual(combinationKey(["color-black", "size-m"]), combinationKey(["color-black", "size-l"]));
    assert.deepEqual(cartesianCombinations([["b", "w"], ["s", "m"]]), [
      ["b", "s"],
      ["b", "m"],
      ["w", "s"],
      ["w", "m"],
    ]);
    assert.equal(variantDisplayName([{ value: "Black" }, { value: "M" }]), "Black / M");
    assert.deepEqual(attributeSnapshot([{ attributeName: "Color", value: "Black" }, { attributeName: "Size", value: "M" }]), [
      { name: "Color", value: "Black" },
      { name: "Size", value: "M" },
    ]);
  });
});

describe("variant stock reservation", () => {
  it("reserves, releases, and fulfills the exact unit", () => {
    assert.deepEqual(applyReserveStock(10, 2, 3), { quantity: 10, reservedQuantity: 5 });
    assert.deepEqual(applyReleaseStock(10, 5, 3), { quantity: 10, reservedQuantity: 2 });
    assert.deepEqual(applyFulfillStock(10, 5, 3), { quantity: 7, reservedQuantity: 2 });
    assert.throws(() => applyReserveStock(10, 8, 3), CommerceError);
  });
});

describe("variant price authorization", () => {
  it("does not attach prices for visitors", () => {
    const visitor = publicVariantForVisitor({
      id: "v1",
      name: "Black / M",
      sku: "TSHIRT-BLK-M",
      inStock: true,
      valueIds: ["c", "s"],
      price: { amount: "12.00", currency: "USD" },
    });
    assert.equal("price" in visitor, false);
    assert.equal(canSeeProductPrices(null), false);
    assert.equal(payloadHasPriceLeak({ variants: [visitor], priceGroupId: "secret" }), true);
    assert.equal(payloadHasPriceLeak({ variants: [visitor] }), false);
  });

  it("returns only the authorized resolved price to an approved buyer", () => {
    const priced = authorizedVariantForBuyer(
      { id: "v1", name: "Black / M", sku: "TSHIRT-BLK-M", inStock: true, valueIds: ["c", "s"] },
      { amount: "18.50", currency: "SAR" },
    );
    assert.deepEqual(priced.price, { amount: "18.50", currency: "SAR" });
  });
});
