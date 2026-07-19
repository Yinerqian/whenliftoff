import { describe, expect, it } from "vitest";
import { localizeLaunchName, localizeProvider, localizeRocketName, localizeStatus } from "@/lib/localization";

describe("Launch Library localization", () => {
  it("uses PRD status labels", () => {
    expect(localizeStatus("Go", "Go")).toEqual({ status: "Go", status_cn: "计划发射" });
    expect(localizeStatus("TBD", "To Be Determined").status_cn).toBe("时间待定");
    expect(localizeStatus("Deployed", "Payload Deployed").status_cn).toBe("载荷已部署");
  });

  it("renders known providers in Chinese", () => {
    expect(localizeProvider("SpaceX")).toBe("太空探索技术公司");
  });

  it("normalizes known rocket and constellation names consistently", () => {
    expect(localizeRocketName("Falcon 9 Block 5")).toBe("猎鹰9号 Block 5");
    expect(localizeRocketName("Falcon Heavy")).toBe("猎鹰重型");
    expect(localizeLaunchName(
      "Falcon 9 Block 5 | Starlink Group 17-39",
      "Falcon 9 Block 5 | Starlink Group 17-39",
    )).toBe("猎鹰9号 Block 5 | 星链组17-39");
    expect(localizeLaunchName("猎鹰9号 Block 5 | 星链组17-48", "unused"))
      .toBe("猎鹰9号 Block 5 | 星链组17-48");
  });
});
