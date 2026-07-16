import { describe, expect, it } from "vitest";
import {
  formatTimelineOffset,
  localizeNetPrecision,
  normalizeTimeline,
  parseRelativeTime,
  selectKeyTimelineEvents,
  toLaunchDetails,
} from "@/lib/launch-details";
import type { LaunchLibraryLaunch } from "@/lib/types";

function launch(overrides: Partial<LaunchLibraryLaunch> = {}): LaunchLibraryLaunch {
  return {
    id: "d9adedc4-8fa1-4a36-84f9-43b8893a6865",
    slug: "falcon-9-test",
    name: "Falcon 9 Block 5 | Test Mission",
    ...overrides,
  };
}

describe("Launch Library detail normalization", () => {
  it("localizes the launch time precision", () => {
    expect(localizeNetPrecision("Second")).toBe("秒级");
    expect(localizeNetPrecision("Minute")).toBe("分钟级");
    expect(localizeNetPrecision("Custom")).toBe("Custom");
  });

  it("parses negative, zero and positive relative times", () => {
    expect(parseRelativeTime("-PT38M")).toBe(-2280);
    expect(parseRelativeTime("P0D")).toBe(0);
    expect(parseRelativeTime("PT1H5M7S")).toBe(3907);
    expect(formatTimelineOffset(-2280)).toBe("T−38:00");
    expect(formatTimelineOffset(0)).toBe("T+00:00");
    expect(formatTimelineOffset(3907)).toBe("T+01:05:07");
  });

  it("sorts timeline nodes and selects the important flight events", () => {
    const timeline = normalizeTimeline([
      { type: { id: 12, abbrev: "MECO" }, relative_time: "PT2M29S" },
      { type: { id: 1, abbrev: "Prop Load" }, relative_time: "-PT35M" },
      { type: { id: 10, abbrev: "Liftoff" }, relative_time: "P0D" },
      { type: { id: 11, abbrev: "Max-Q" }, relative_time: "PT1M14S" },
    ]);

    expect(timeline.map((event) => event.code)).toEqual(["Prop Load", "Liftoff", "Max-Q", "MECO"]);
    expect(timeline[1]).toMatchObject({ title: "火箭起飞", phase: "liftoff", is_key_event: true });
    expect(selectKeyTimelineEvents(timeline).map((event) => event.code)).toEqual(["Liftoff", "Max-Q", "MECO"]);
  });

  it("fully localizes the Starship flight timeline", () => {
    const codes = [
      "Stage 1 LNG Load",
      "Stage 2 LNG Load",
      "Stage 1 Propellant Load Complete",
      "Stage 2 Propellant Load Complete",
      "Flame Deflector Activation",
      "Excitement Guaranteed",
      "Booster Boostback Burn Startup",
      "Booster Boostback Burn Shutdown",
      "Payload Deployment Sequence Start",
      "Payload Deployment Sequence End",
      "SEB-2",
      "Atmospheric Entry",
      "Starship Transonic",
      "Starship Subsonic",
      "Starship Landing Burn",
      "Landing Flip",
      "Starship Landing",
    ];
    const timeline = normalizeTimeline(codes.map((code, index) => ({
      type: { id: index + 1, abbrev: code, description: `English description ${index}` },
      relative_time: `PT${index + 1}S`,
    })));

    expect(timeline).toHaveLength(codes.length);
    expect(timeline.every((event) => !/[A-Za-z]/.test(event.title))).toBe(true);
    expect(timeline.every((event) => event.description && !/[A-Za-z]/.test(event.description))).toBe(true);
  });

  it("prioritizes official video links and builds a coordinate map fallback", () => {
    const details = toLaunchDetails(launch({
      launch_service_provider: { name: "SpaceX", type: { name: "Commercial" } },
      pad: { name: "SLC-4E", latitude: 34.632, longitude: -120.611 },
      vid_urls: [
        { priority: 9, publisher: "Spaceflight Now", type: { name: "Unofficial Webcast" }, url: "https://example.com/third-party" },
        { priority: 10, publisher: "SpaceX", type: { name: "Official Webcast" }, url: "https://example.com/official" },
      ],
    }));

    expect(details.video_links.map((video) => video.url)).toEqual([
      "https://example.com/official",
      "https://example.com/third-party",
    ]);
    expect(details.video_links[0].official).toBe(true);
    expect(details.video_links[1].official).toBe(false);
    expect(details.map_url).toBe("https://www.google.com/maps?q=34.632,-120.611");
  });

  it("normalizes rocket, orbit, booster and landing information", () => {
    const details = toLaunchDetails(launch({
      window_start: "2026-07-16T20:22:00Z",
      window_end: "2026-07-16T21:09:00Z",
      mission: { type: "Government/Top Secret", orbit: { name: "Polar Orbit", abbrev: "PO" } },
      rocket: {
        configuration: {
          full_name: "Falcon 9 Block 5",
          manufacturer: { name: "SpaceX" },
          reusable: true,
          min_stage: 2,
          max_stage: 2,
          length: 70,
          diameter: 3.65,
          launch_mass: 549,
          leo_capacity: 22800,
          gto_capacity: 8300,
        },
        launcher_stage: [{
          reused: true,
          launcher_flight_number: 4,
          launcher: { serial_number: "B1103" },
          landing: {
            attempt: true,
            landing_location: { name: "Of Course I Still Love You" },
            type: { name: "Autonomous Spaceport Drone Ship" },
          },
        }],
      },
    }));

    expect(details).toMatchObject({
      mission_type: "Government/Top Secret",
      orbit_abbrev: "PO",
      rocket_manufacturer: "SpaceX",
      rocket_reusable: true,
      booster_serial: "B1103",
      booster_flight_number: 4,
      landing_attempt: true,
      landing_location: "Of Course I Still Love You",
    });
  });

  it("keeps optional detail collections empty when upstream data is missing", () => {
    const details = toLaunchDetails(launch());
    expect(details.timeline).toEqual([]);
    expect(details.video_links).toEqual([]);
    expect(details.info_links).toEqual([]);
    expect(details.map_url).toBeNull();
  });
});
