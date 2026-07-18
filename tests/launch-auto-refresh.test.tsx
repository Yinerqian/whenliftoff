// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchAutoRefresh } from "@/components/launch-auto-refresh";

const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("LaunchAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));
    routerRefresh.mockReset();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("refreshes every 60 seconds only while visible, online, and inside the hot window", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<LaunchAutoRefresh launchTimes={["2026-07-18T13:00:00.000Z"]} />);
    });
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(routerRefresh).toHaveBeenCalledOnce();

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(routerRefresh).toHaveBeenCalledOnce();

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(routerRefresh).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
  });

  it("does not refresh when every launch is outside the hot window", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<LaunchAutoRefresh launchTimes={["2026-07-16T11:59:59.999Z"]} />);
    });
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(routerRefresh).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
