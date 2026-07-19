import { describe, expect, it } from "vitest";
import { normalizeLaunchTranslation } from "@/lib/translation";

describe("launch translation normalization", () => {
  it("repairs cached translations that preserved known English rocket terms", () => {
    expect(normalizeLaunchTranslation(
      {
        name: "Falcon 9 Block 5 | Starlink Group 17-39",
        description: null,
        location: null,
      },
      {
        name_cn: "Falcon 9 Block 5 | Starlink Group 17-39",
        mission_description_cn: null,
        location_cn: null,
      },
    )).toEqual({
      name_cn: "猎鹰9号 Block 5 | 星链组17-39",
      mission_description_cn: null,
      location_cn: null,
    });
  });
});
