import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLaunchesByIdsFresh, selectLatestLaunchSnapshots } from "@/lib/launch-library";
import { hasLaunchInRefreshWindow } from "@/lib/launch-refresh";
import {
  hotSyncBounds,
  isOlderApiSnapshot,
  parseLaunchSyncMode,
  selectHotLaunchCandidates,
} from "@/lib/sync-launches";
import type { LaunchLibraryLaunch } from "@/lib/types";

function launch(id: string, status: string, updatedAt: string, net = "2026-07-17T00:00:00Z"): LaunchLibraryLaunch {
  return {
    id,
    slug: id,
    name: `Launch ${id}`,
    status: { abbrev: status, name: status },
    net,
    last_updated: updatedAt,
  };
}

describe("launch synchronization snapshots", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the most recently updated copy when upcoming and previous overlap", () => {
    const stalePrevious = launch("shifted", "TBC", "2026-07-16T00:00:00Z");
    const freshUpcoming = launch("shifted", "Go", "2026-07-18T00:00:00Z", "2026-07-20T00:00:00Z");

    expect(selectLatestLaunchSnapshots([freshUpcoming], [stalePrevious]))
      .toEqual([freshUpcoming]);
  });

  it("uses a fresh detail result to replace a stale non-terminal list snapshot", () => {
    const staleList = launch("completed", "Go", "2026-07-13T00:00:00Z");
    const freshDetail = launch("completed", "Success", "2026-07-17T01:00:00Z");

    expect(selectLatestLaunchSnapshots([], [staleList], [freshDetail]))
      .toEqual([freshDetail]);
  });

  it("deduplicates snapshots without timestamps deterministically", () => {
    const first = launch("unknown", "TBD", "");
    const second = launch("unknown", "Go", "");

    expect(selectLatestLaunchSnapshots([first], [second]))
      .toEqual([second]);
  });

  it("refreshes multiple launches with the documented comma-separated id filter", async () => {
    const request = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      expect(url.pathname).toBe("/2.3.0/launches/");
      expect(url.searchParams.get("id")).toBe("first,second");
      expect(url.searchParams.get("limit")).toBe("2");
      expect(url.searchParams.get("mode")).toBe("normal");
      return Response.json({ count: 0, next: null, results: [] });
    });
    vi.stubGlobal("fetch", request);

    await expect(fetchLaunchesByIdsFresh(["first", "first", "second"]))
      .resolves.toEqual([]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("uses the inclusive 48-hour past and 6-hour future hot window", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");

    expect(hotSyncBounds(now)).toEqual({
      from: "2026-07-16T12:00:00.000Z",
      to: "2026-07-18T18:00:00.000Z",
    });
    expect(selectHotLaunchCandidates([
      { id: "past-boundary", launch_time_utc: "2026-07-16T12:00:00.000Z", status: "Success" },
      { id: "future-boundary", launch_time_utc: "2026-07-18T18:00:00.000Z", status: "Go" },
      { id: "too-old", launch_time_utc: "2026-07-16T11:59:59.999Z", status: "Failure" },
      { id: "too-new", launch_time_utc: "2026-07-18T18:00:00.001Z", status: "TBD" },
    ], now).map((item) => item.id)).toEqual(["past-boundary", "future-boundary"]);
  });

  it("continues selecting terminal launches and enforces the 100-candidate limit", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const launches = Array.from({ length: 105 }, (_, index) => ({
      id: String(index),
      launch_time_utc: new Date(now.getTime() - 105 * 60_000 + index * 60_000).toISOString(),
      status: index % 2 ? "Success" : "Failure",
    }));

    const selected = selectHotLaunchCandidates(launches, now);
    expect(selected).toHaveLength(100);
    expect(selected.every((item) => item.status === "Success" || item.status === "Failure")).toBe(true);
  });

  it("does not allow an older API snapshot to overwrite a newer one", () => {
    expect(isOlderApiSnapshot("2026-07-17T00:00:00Z", "2026-07-18T00:00:00Z")).toBe(true);
    expect(isOlderApiSnapshot("2026-07-19T00:00:00Z", "2026-07-18T00:00:00Z")).toBe(false);
    expect(isOlderApiSnapshot(null, "2026-07-18T00:00:00Z")).toBe(true);
  });

  it("validates cron modes and defaults a missing mode to full", () => {
    expect(parseLaunchSyncMode(null)).toBe("full");
    expect(parseLaunchSyncMode("hot")).toBe("hot");
    expect(parseLaunchSyncMode("invalid")).toBeNull();
  });

  it("only enables page refresh while a launch is in the hot window", () => {
    const now = Date.parse("2026-07-18T12:00:00.000Z");
    expect(hasLaunchInRefreshWindow(["2026-07-16T12:00:00.000Z"], now)).toBe(true);
    expect(hasLaunchInRefreshWindow(["2026-07-18T18:00:00.000Z"], now)).toBe(true);
    expect(hasLaunchInRefreshWindow(["2026-07-16T11:59:59.999Z"], now)).toBe(false);
    expect(hasLaunchInRefreshWindow([null, "not-a-date"], now)).toBe(false);
  });
});
