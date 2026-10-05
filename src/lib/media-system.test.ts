import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampScale,
  getMediaFit,
  hoverScale,
  mediaPositionFor,
  parseFitMode,
  resolveMediaMode,
  resolveMediaPresentation,
} from "./media-system";

describe("media modes", () => {
  it("defaults to editorial cover", () => {
    assert.equal(resolveMediaMode({ src: "/uploads/banana.webp" }), "EDITORIAL_PHOTO");
    assert.equal(getMediaFit({ src: "/uploads/banana.webp" }), "cover");
  });

  it("marks isolated only when the asset is explicitly isolated", () => {
    assert.equal(resolveMediaMode({ src: "/uploads/pear-isolated.png" }), "ISOLATED_PRODUCT");
    assert.equal(getMediaFit({ src: "/uploads/pear-isolated.png" }), "contain");
  });

  it("does not treat png or webp as isolated by file type", () => {
    assert.equal(resolveMediaMode({ src: "/uploads/Banana-Definition.webp", fileType: "IMAGE" }), "EDITORIAL_PHOTO");
  });

  it("allows explicit fit override without inferring from extension", () => {
    assert.equal(getMediaFit({ src: "/uploads/tomato.jpg", fitMode: "CONTAIN" }), "contain");
    assert.equal(getMediaFit({ src: "/uploads/jar-isolated.png", fitMode: "COVER" }), "cover");
    assert.equal(parseFitMode("cover"), "AUTO");
  });
});

describe("media presentation", () => {
  it("uses centralized category object-position as a default focal", () => {
    assert.equal(mediaPositionFor("beverages"), "50% 40%");
    const framed = resolveMediaPresentation({ mediaContext: "category-hero", categorySlug: "spices" });
    assert.equal(framed.focalX, 50);
    assert.equal(framed.focalY, 60);
    assert.equal(framed.scale, 1);
  });

  it("keeps saved focal and scale instead of category defaults", () => {
    const framed = resolveMediaPresentation({
      mediaContext: "product-card",
      categorySlug: "spices",
      focalX: 42,
      focalY: 38,
      scale: 1.08,
    });
    assert.equal(framed.focalX, 42);
    assert.equal(framed.focalY, 38);
    assert.equal(framed.scale, 1.08);
    assert.equal(framed.hover, hoverScale(1.08, "EDITORIAL_PHOTO"));
  });

  it("clamps scale to the admin range", () => {
    assert.equal(clampScale(0.2), 0.75);
    assert.equal(clampScale(2), 1.3);
  });
});
