import { describe, expect, it } from "vitest";
import { resolveLaunchImageUrl } from "@/lib/image";

describe("launch image resolver", () => {
  it("extracts the URL from a Launch Library image object", () => {
    expect(resolveLaunchImageUrl({ image_url: "https://example.com/rocket.jpg" })).toBe("https://example.com/rocket.jpg");
  });

  it("supports legacy JSON image values already stored in the database", () => {
    expect(resolveLaunchImageUrl('{"thumbnail_url":"https://example.com/rocket-thumb.jpg"}')).toBe("https://example.com/rocket-thumb.jpg");
  });
});
