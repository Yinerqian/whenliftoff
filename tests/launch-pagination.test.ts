import { describe, expect, it } from "vitest";
import { nextLaunchPage } from "@/lib/launch-pagination";

describe("launch schedule pagination", () => {
  it("continues through every page in the current month before changing scope", () => {
    expect(nextLaunchPage("month-page-2", "month")).toEqual({
      scope: "month",
      cursor: "month-page-2",
    });
  });

  it("moves to future months after the current month is exhausted", () => {
    expect(nextLaunchPage(null, "month")).toEqual({ scope: "future" });
  });

  it("continues future pagination until the database is exhausted", () => {
    expect(nextLaunchPage("future-page-2", "future")).toEqual({
      scope: "future",
      cursor: "future-page-2",
    });
    expect(nextLaunchPage(null, "future")).toBeNull();
  });
});
