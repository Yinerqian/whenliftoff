import { describe, expect, it } from "vitest";
import { limitPastLaunches, nextLaunchPage } from "@/lib/launch-pagination";

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

  it("keeps only the five most recent past launches while preserving future and TBD launches", () => {
    const launches = [
      ...Array.from({ length: 7 }, (_, index) => ({
        id: `past-${index + 1}`,
        launch_time_utc: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      })),
      { id: "future", launch_time_utc: "2026-07-20T00:00:00Z" },
      { id: "tbd", launch_time_utc: null },
    ];

    expect(limitPastLaunches(launches, Date.parse("2026-07-10T00:00:00Z")).map((launch) => launch.id))
      .toEqual(["past-3", "past-4", "past-5", "past-6", "past-7", "future", "tbd"]);
  });

  it("supports hiding all past launches without removing a launch at a future time", () => {
    const launches = [
      { id: "past", launch_time_utc: "2026-07-09T23:59:59Z" },
      { id: "now", launch_time_utc: "2026-07-10T00:00:00Z" },
      { id: "future", launch_time_utc: "2026-07-10T00:00:01Z" },
    ];

    expect(limitPastLaunches(launches, Date.parse("2026-07-10T00:00:00Z"), 0).map((launch) => launch.id))
      .toEqual(["future"]);
  });
});
