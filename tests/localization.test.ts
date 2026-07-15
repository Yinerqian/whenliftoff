import { describe, expect, it } from "vitest";
import { localizeProvider, localizeStatus } from "@/lib/localization";

describe("Launch Library localization", () => {
  it("uses PRD status labels", () => {
    expect(localizeStatus("Go", "Go")).toEqual({ status: "Go", status_cn: "计划发射" });
    expect(localizeStatus("TBD", "To Be Determined").status_cn).toBe("时间待定");
  });

  it("renders known providers in Chinese", () => {
    expect(localizeProvider("SpaceX")).toBe("太空探索技术公司");
  });
});
