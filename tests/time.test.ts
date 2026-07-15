import { describe, expect, it } from "vitest";
import { countdownParts, formatBeijingTime, formatUtcTime } from "@/lib/time";

describe("time helpers", () => {
  it("formats one timestamp in Beijing and UTC", () => {
    expect(formatBeijingTime("2026-07-11T13:30:00Z")).toContain("21:30");
    expect(formatUtcTime("2026-07-11T13:30:00Z")).toContain("13:30");
  });

  it("returns countdown parts for a future launch", () => {
    expect(countdownParts("2026-07-12T00:00:00Z", Date.parse("2026-07-11T00:00:00Z"))).toMatchObject({ days: 1, hours: 0 });
  });
});
