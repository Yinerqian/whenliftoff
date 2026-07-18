import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLaunchesByIdsFresh, selectLatestLaunchSnapshots } from "@/lib/launch-library";
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
});
