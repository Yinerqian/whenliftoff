import { describe, expect, it } from "vitest";
import { toLaunchRecord } from "@/lib/launch-library";
import { aggregateHomeLaunchStatistics, completeUtcMonthRange } from "@/lib/launch-statistics";
import type { LaunchLibraryLaunch } from "@/lib/types";

function launch(
  id: string,
  net: string,
  status: string,
  provider: string,
  country: string,
  rocket: string,
  pad = "Pad A",
): LaunchLibraryLaunch {
  return {
    id,
    slug: id,
    name: `Mission ${id}`,
    net,
    status: { abbrev: status },
    launch_service_provider: { name: provider, abbrev: provider.slice(0, 4).toUpperCase() },
    rocket: { configuration: { full_name: rocket } },
    pad: {
      id: Number(id.replace(/\D/g, "")) || 1,
      name: pad,
      location: { name: `${country} launch site`, country: { name: country, alpha_3_code: country } },
    },
  };
}

describe("home launch statistics", () => {
  it("uses the previous twelve complete UTC months", () => {
    expect(completeUtcMonthRange(new Date("2026-07-18T12:00:00Z"))).toEqual({
      start: "2025-07-01T00:00:00.000Z",
      end: "2026-07-01T00:00:00.000Z",
    });
  });

  it("builds complete monthly buckets and terminal-status success metrics", () => {
    const stats = aggregateHomeLaunchStatistics([
      launch("1", "2025-07-10T10:00:00Z", "Success", "SpaceX", "USA", "Falcon 9"),
      launch("2", "2025-07-21T10:00:00Z", "Failure", "Rocket Lab", "NZL", "Electron", "Pad B"),
      launch("3", "2025-09-04T10:00:00Z", "Partial Failure", "CASC", "CHN", "Long March 2", "Pad C"),
      launch("4", "2025-09-15T10:00:00Z", "TBD", "SpaceX", "USA", "Falcon 9"),
      launch("outside", "2026-07-02T10:00:00Z", "Success", "SpaceX", "USA", "Falcon 9"),
    ], "2025-07-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z", "2026-07-18T00:00:00Z");

    expect(stats.monthly).toHaveLength(12);
    expect(stats.monthly[0]).toEqual({ month: "2025-07", total: 2, successful: 1 });
    expect(stats.monthly[1]).toEqual({ month: "2025-08", total: 0, successful: 0 });
    expect(stats.monthly[2]).toEqual({ month: "2025-09", total: 2, successful: 0 });
    expect(stats).toMatchObject({
      total_launches: 4,
      successful_launches: 1,
      failed_launches: 2,
      success_rate: 33.3,
      active_providers: 3,
      active_countries: 3,
      active_pads: 4,
    });
    expect(stats.providers[0]).toMatchObject({ name: "SpaceX", count: 2, share: 50 });
    expect(stats.rockets[0]).toMatchObject({ name: "Falcon 9", count: 2, share: 50 });
  });

  it("normalizes the Launch Library 2.3 nested country code", () => {
    const record = toLaunchRecord(launch("5", "2026-06-01T10:00:00Z", "Success", "SpaceX", "USA", "Falcon 9"));
    expect(record.country_code).toBe("USA");
  });
});
