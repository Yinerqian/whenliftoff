import { describe, expect, it } from "vitest";
import { getNewsImageTraits, resolveLaunchImageUrl } from "@/lib/image";

describe("launch image resolver", () => {
  it("extracts the URL from a Launch Library image object", () => {
    expect(resolveLaunchImageUrl({ image_url: "https://example.com/rocket.jpg" })).toBe("https://example.com/rocket.jpg");
  });

  it("supports legacy JSON image values already stored in the database", () => {
    expect(resolveLaunchImageUrl('{"thumbnail_url":"https://example.com/rocket-thumb.jpg"}')).toBe("https://example.com/rocket-thumb.jpg");
  });
});

describe("news image presentation", () => {
  it("keeps regular high-resolution images at the standard presentation", () => {
    expect(getNewsImageTraits(1200, 800)).toEqual({ isExtremeRatio: false, isLowResolution: false });
  });

  it("detects unusually wide and tall images", () => {
    expect(getNewsImageTraits(1800, 500).isExtremeRatio).toBe(true);
    expect(getNewsImageTraits(500, 1200).isExtremeRatio).toBe(true);
  });

  it("detects images that should not be enlarged to fill the lead card", () => {
    expect(getNewsImageTraits(320, 180).isLowResolution).toBe(true);
    expect(getNewsImageTraits(480, 270).isLowResolution).toBe(true);
    expect(getNewsImageTraits(960, 540).isLowResolution).toBe(false);
  });
});
