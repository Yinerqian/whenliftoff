"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { hasLaunchInRefreshWindow } from "@/lib/launch-refresh";

const REFRESH_INTERVAL_MS = 60_000;

export function LaunchAutoRefresh({
  launchTimes,
  onRefresh,
}: {
  launchTimes: Array<string | null | undefined>;
  onRefresh?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const refreshRef = useRef(onRefresh);
  const runningRef = useRef(false);
  const launchTimesKey = launchTimes.filter(Boolean).join("|");

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const values = launchTimesKey ? launchTimesKey.split("|") : [];

    async function refreshWhenActive() {
      if (runningRef.current
        || document.visibilityState !== "visible"
        || !navigator.onLine
        || !hasLaunchInRefreshWindow(values)) return;
      runningRef.current = true;
      try {
        if (refreshRef.current) await refreshRef.current();
        else router.refresh();
      } finally {
        runningRef.current = false;
      }
    }

    const timer = window.setInterval(() => void refreshWhenActive(), REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshWhenActive();
    };
    window.addEventListener("online", refreshWhenActive);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refreshWhenActive);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [launchTimesKey, router]);

  return null;
}
