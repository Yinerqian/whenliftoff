"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { BackToTop } from "@/components/back-to-top";
import { LaunchAutoRefresh } from "@/components/launch-auto-refresh";
import { LAUNCH_SEARCH_EVENT } from "@/components/site-frame";
import { UpcomingLaunchCard } from "@/components/upcoming-launch-card";
import { resolveLaunchImageUrl } from "@/lib/image";
import { getLaunchStatusMeta } from "@/lib/launch-status";
import { formatBeijingClock } from "@/lib/time";
import type { Launch, LaunchResult } from "@/lib/types";

type Filters = { q: string; provider: string };
type LaunchScope = "month" | "future";
type TimelineGroup = {
  key: string;
  launches: Launch[];
};
type LiveLaunchSnapshot = {
  items: Launch[];
  recentCompleted: Launch[];
  lastSyncedAt: string | null;
};
type LaunchNavigationHandlers = {
  isNavigating: boolean;
  onNavigate: (event: PointerEvent<HTMLAnchorElement>, href: string) => void;
  onCommit: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
  onCancel: (href: string) => void;
};

const initialFilters: Filters = { q: "", provider: "" };

function requestParams(filters: Filters, cursor?: string | null, scope: LaunchScope = "month") {
  const params = new URLSearchParams({ limit: "18" });
  if (scope === "month") params.set("month", "current");
  else params.set("scope", "future");
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.provider) params.set("provider", filters.provider);
  if (cursor) params.set("cursor", cursor);
  return params;
}

function makeTimeline(launches: Launch[]) {
  const groups = new Map<string, TimelineGroup>();
  for (const launch of launches) {
    const key = launch.launch_time_utc
      ? new Date(launch.launch_time_utc).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
      : "tbd";
    if (!groups.has(key)) {
      groups.set(key, { key, launches: [] });
    }
    groups.get(key)?.launches.push(launch);
  }
  return [...groups.values()];
}

function formatTimelineDate(value: string | null) {
  if (!value) return "日期待定";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(value));
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return month && day ? `${month}月${day}日` : "日期待定";
}

function relativeDay(key: string) {
  if (key === "tbd") return "日期待定";
  const today = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Shanghai" }));
  const target = new Date(`${key}T00:00:00+08:00`);
  const delta = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (delta === 0) return "今天";
  if (delta === 1) return "明天";
  if (delta === -1) return "昨天";
  if (delta === 2) return "后天";
  if (delta === -2) return "前天";
  const absoluteDays = Math.abs(delta);
  const direction = delta > 0 ? "后" : "前";
  if (absoluteDays >= 7) {
    const weeks = Math.floor(absoluteDays / 7);
    const days = absoluteDays % 7;
    return `${weeks}周${days ? `${days}天` : ""}${direction}`;
  }
  return `${absoluteDays}天${direction}`;
}

function formatRecentLaunchDate(value: string | null) {
  if (!value) return "日期待定";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(value));
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return month && day ? `${month}月${day}日` : "日期待定";
}

function countryFlag(code: string | null) {
  if (!code) return "🌐";
  const alpha2 = ({ USA: "US", CHN: "CN", RUS: "RU", IND: "IN", KAZ: "KZ", NZL: "NZ", KOR: "KR", JPN: "JP", FRA: "FR", ITA: "IT", DEU: "DE", GBR: "GB", MHL: "MH" } as Record<string, string>)[code.toUpperCase()] || code;
  if (alpha2.length !== 2) return "🌐";
  return alpha2
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function shortProvider(provider: string) {
  const known: Record<string, string> = {
    "China Aerospace Science and Technology Corporation": "中国航天",
    "Russian Federal Space Agency (ROSCOSMOS)": "Roscosmos",
    "Indian Space Research Organization": "ISRO",
    "Rocket Lab": "火箭实验室",
    "United Launch Alliance": "ULA",
    "Agency for Defense Development": "韩国 ADD",
  };
  return known[provider] || (provider.length > 22 ? `${provider.slice(0, 20)}…` : provider);
}

type LaunchCardIconName = "agency" | "clock" | "globe" | "pin" | "rocket";

function LaunchCardIcon({ name }: { name: LaunchCardIconName }) {
  const shapes: Record<LaunchCardIconName, ReactNode> = {
    agency: <><path d="M3 21h18" /><path d="M6 21V7l6-4v18" /><path d="M18 21V11l-6-3" /><path d="M9 9v1M9 13v1M9 17v1M15 13v1M15 17v1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    rocket: <><path d="M14.5 5.5C13 3.7 12 3 12 3s-1 0.7-2.5 2.5C7.8 7.6 7 10.2 7 13l5 3 5-3c0-2.8-.8-5.4-2.5-7.5Z" /><circle cx="12" cy="9" r="1.5" /><path d="M7.5 11 4 14v4l4-2M16.5 11l3.5 3v4l-4-2M10 17l2 4 2-4" /></>,
  };
  return (
    <svg className="launch-info-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  );
}

function formatCardDate(value: string | null) {
  if (!value) return "发射时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function LaunchCardCountdown({ value, hidden = false }: { value: string | null; hidden?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const target = value ? new Date(value).getTime() : Number.NaN;
    if (hidden || !Number.isFinite(target)) {
      setNow(null);
      return;
    }

    let timer: number | undefined;
    const update = () => {
      const current = Date.now();
      setNow(current);
      if (current >= target && timer !== undefined) window.clearInterval(timer);
    };

    update();
    if (Date.now() < target) timer = window.setInterval(update, 1000);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [hidden, value]);

  if (hidden || !value || now === null) return null;
  const remaining = new Date(value).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.ceil(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const valueLabel = `${days ? `${days}天 ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return (
    <span className="launch-countdown" aria-label={`距离发射${valueLabel}`}>
      T− {valueLabel}
    </span>
  );
}

function LaunchNavigationFeedback() {
  return (
    <span className="launch-navigation-feedback" role="status">
      <span className="launch-navigation-feedback-pill">
        <span className="launch-navigation-spinner" aria-hidden="true" />
        正在打开详情
      </span>
    </span>
  );
}

function LaunchCard({ launch, isNew = false, enterIndex = 0, isNavigating, onNavigate, onCommit, onCancel }: { launch: Launch; isNew?: boolean; enterIndex?: number } & LaunchNavigationHandlers) {
  const imageUrl = resolveLaunchImageUrl(launch.image_url);
  const status = getLaunchStatusMeta(launch.status, launch.status_cn);
  const tone = status.tone;
  const href = `/launches/${launch.external_id}`;
  return (
    <Link
      className={`launch-row${isNew ? " is-new" : ""}${isNavigating ? " is-navigating" : ""}`}
      href={href}
      style={isNew ? { animationDelay: `${Math.min(enterIndex, 5) * 35}ms` } : undefined}
      aria-busy={isNavigating}
      onPointerDown={(event) => onNavigate(event, href)}
      onClick={(event) => onCommit(event, href)}
      onPointerCancel={() => onCancel(href)}
      onPointerLeave={(event) => { if (event.buttons !== 0) onCancel(href); }}
    >
      <div
        className="launch-thumb"
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
        aria-hidden="true"
      />
      <div className="launch-copy">
        <h3>
          {launch.name_cn || launch.name}
          <span className="flag">{countryFlag(launch.country_code)}</span>
        </h3>
        <div className="launch-schedule-line">
          <span className="launch-schedule-time"><LaunchCardIcon name="clock" />{formatCardDate(launch.launch_time_utc)} CST</span>
          <LaunchCardCountdown value={launch.launch_time_utc} hidden={tone === "success" || tone === "failed"} />
        </div>
        <div className="launch-info-grid">
          <span title={launch.provider_cn || launch.provider || "机构待确认"}><LaunchCardIcon name="agency" />{launch.provider_cn || launch.provider || "机构待确认"}</span>
          <span title={launch.rocket_name || "运载火箭待确认"}><LaunchCardIcon name="rocket" />{launch.rocket_name || "运载火箭待确认"}</span>
          <span title={launch.pad || "发射台待确认"}><LaunchCardIcon name="pin" />{launch.pad || "发射台待确认"}</span>
          <span title={launch.location_cn || launch.location || "地点待确认"}><LaunchCardIcon name="globe" />{launch.location_cn || launch.location || "地点待确认"}</span>
        </div>
      </div>
      <div className={`launch-state state-${tone}`}>
        <span>{status.label}</span>
      </div>
      {isNavigating && <LaunchNavigationFeedback />}
    </Link>
  );
}

export function LaunchSchedule({ initial, recentCompleted, initialError = false, initialSearch = "" }: { initial: LaunchResult; recentCompleted: Launch[]; initialError?: boolean; initialSearch?: string }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, q: initialSearch });
  const [result, setResult] = useState(initial);
  const [recentLaunches, setRecentLaunches] = useState(recentCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [providerExpanded, setProviderExpanded] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"replace" | "append" | null>(null);
  const [resultRevision, setResultRevision] = useState(0);
  const [newLaunchIds, setNewLaunchIds] = useState<string[]>([]);
  const [agencyIndicator, setAgencyIndicator] = useState({ left: 0, right: 0, trackWidth: 1, ready: false });
  const [agencyIndicatorCanAnimate, setAgencyIndicatorCanAnimate] = useState(false);
  const [navigationState, setNavigationState] = useState<{ href: string } | null>(null);
  const agencyFiltersRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const newCardsTimerRef = useRef<number | null>(null);
  const navigationResetRef = useRef<number | null>(null);
  const navigationCommitRef = useRef<number | null>(null);

  const timeline = useMemo(() => makeTimeline(result.items), [result.items]);
  const hero = useMemo(
    () => result.items.find((launch) => launch.launch_time_utc && new Date(launch.launch_time_utc).getTime() > Date.now())
      ?? result.items.find((launch) => launch.launch_time_utc)
      ?? null,
    [result.items],
  );
  const providerCounts = useMemo(() => {
    return new Map(result.providerCounts.map(({ provider, count }) => [provider, count]));
  }, [result.providerCounts]);
  const providerOptions = useMemo(() => [...providerCounts.entries()].slice(0, 6), [providerCounts]);
  const showLoadMore = Boolean(result.nextCursor) || Boolean(filters.provider && !providerExpanded);

  useLayoutEffect(() => {
    const container = agencyFiltersRef.current;
    if (!container) return;

    const updateIndicator = () => {
      const activeButton = container.querySelector<HTMLButtonElement>('button[aria-selected="true"]');
      if (!activeButton) return;
      const trackWidth = container.scrollWidth;
      const next = {
        left: activeButton.offsetLeft,
        right: Math.max(0, trackWidth - activeButton.offsetLeft - activeButton.offsetWidth),
        trackWidth,
        ready: true,
      };
      setAgencyIndicator((current) => current.left === next.left
        && current.right === next.right
        && current.trackWidth === next.trackWidth
        && current.ready
        ? current
        : next);
    };

    updateIndicator();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    observer?.observe(container);
    container.querySelectorAll("button").forEach((button) => observer?.observe(button));
    window.addEventListener("resize", updateIndicator);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [filters.provider, providerOptions]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAgencyIndicatorCanAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setRecentLaunches(recentCompleted);
  }, [recentCompleted]);

  useEffect(() => () => {
    if (newCardsTimerRef.current !== null) window.clearTimeout(newCardsTimerRef.current);
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
  }, []);

  function beginNavigation(event: PointerEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    setNavigationState({ href });
    navigationResetRef.current = window.setTimeout(() => {
      setNavigationState((current) => current?.href === href ? null : current);
      navigationResetRef.current = null;
    }, 2500);
  }

  function cancelNavigation(href: string) {
    setNavigationState((current) => current?.href === href ? null : current);
  }

  function commitNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.detail === 0 || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setNavigationState((current) => current?.href === href ? current : { href });
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(href);
      navigationCommitRef.current = null;
    }, 110);
  }

  const load = useCallback(async (nextFilters: Filters, cursor?: string | null, append = false, scope: LaunchScope = "month") => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMode(append ? "append" : "replace");
    setError(false);
    const params = requestParams(nextFilters, cursor, scope);
    try {
      const response = await fetch(`/api/launches?${params.toString()}`);
      if (!response.ok) throw new Error("无法加载日程");
      const data = (await response.json()) as LaunchResult;
      if (requestId !== requestIdRef.current) return false;
      setResult((current) => append ? { ...data, items: [...current.items, ...data.items] } : data);
      if (append) {
        if (newCardsTimerRef.current !== null) window.clearTimeout(newCardsTimerRef.current);
        setNewLaunchIds(data.items.map((launch) => launch.external_id));
        newCardsTimerRef.current = window.setTimeout(() => setNewLaunchIds([]), 520);
      } else {
        setNewLaunchIds([]);
        setResultRevision((current) => current + 1);
      }
      if (!append) window.history.replaceState(null, "", `/launches?${params.toString()}`);
      return true;
    } catch {
      if (requestId !== requestIdRef.current) return false;
      setError(true);
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMode(null);
      }
    }
  }, []);

  const refreshVisibleLaunches = useCallback(async () => {
    const ids = result.items.map((launch) => launch.external_id);
    const params = new URLSearchParams({ ids: ids.join(",") });
    const response = await fetch(`/api/launches/live?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return;
    const snapshot = await response.json() as LiveLaunchSnapshot;
    const freshById = new Map(snapshot.items.map((launch) => [launch.external_id, launch]));
    setResult((current) => ({
      ...current,
      items: current.items.map((launch) => freshById.get(launch.external_id) ?? launch),
      lastSyncedAt: snapshot.lastSyncedAt ?? current.lastSyncedAt,
    }));
    setRecentLaunches(snapshot.recentCompleted);
  }, [result.items]);

  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      const q = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "";
      const next = { ...filters, q };
      setProviderExpanded(false);
      setFilters(next);
      void load(next);
    }
    window.addEventListener(LAUNCH_SEARCH_EVENT, handleHeaderSearch);
    return () => window.removeEventListener(LAUNCH_SEARCH_EVENT, handleHeaderSearch);
  }, [filters, load]);

  function selectProvider(provider: string) {
    const next = { ...filters, provider };
    setProviderExpanded(false);
    setFilters(next);
    void load(next);
  }

  async function loadMore() {
    if (result.nextCursor) {
      await load(filters, result.nextCursor, true, providerExpanded ? "future" : "month");
      return;
    }
    if (filters.provider && !providerExpanded) {
      const loaded = await load(filters, undefined, true, "future");
      if (loaded) setProviderExpanded(true);
    }
  }

  return (
    <main className="launch-route-main">
      <LaunchAutoRefresh launchTimes={result.items.map((launch) => launch.launch_time_utc)} onRefresh={refreshVisibleLaunches} />
      <section className="dashboard launch-page-content" id="overview">
        <h1 className="sr-only">全球火箭发射日程</h1>
        <section className="filters-row" id="agencies" aria-label="发射机构分类">
          <div
            ref={agencyFiltersRef}
            className={`agency-filters${agencyIndicator.ready ? " has-indicator" : ""}${agencyIndicatorCanAnimate ? " indicator-can-animate" : ""}`}
            role="tablist"
            aria-label="发射机构"
          >
            <span
              className="agency-active-indicator"
              aria-hidden="true"
              style={{
                opacity: agencyIndicator.ready ? 1 : 0,
                width: `${agencyIndicator.trackWidth}px`,
                clipPath: `inset(0 ${agencyIndicator.right}px 0 ${agencyIndicator.left}px round 999px)`,
              }}
            />
            <button
              className={!filters.provider ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={!filters.provider}
              onClick={() => selectProvider("")}
            >
              全部机构 <span>{result.monthTotal}</span>
            </button>
            {providerOptions.map(([provider, count]) => (
              <button
                className={filters.provider === provider ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={filters.provider === provider}
                key={provider}
                onClick={() => selectProvider(provider)}
              >
                {shortProvider(provider)} <span>{count}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="content-grid" id="schedule">
          <section className="timeline" aria-label="发射时间线" aria-busy={loading}>
            <div
              className={`timeline-results${loadingMode === "replace" ? " is-updating" : ""}`}
              key={resultRevision}
            >
              {error ? (
                <div className="state-card error-state">发射日程暂时不可用，请稍后重试。</div>
              ) : result.items.length === 0 && !loading ? (
                <div className="state-card">暂无符合条件的发射任务。</div>
              ) : (
                timeline.map((group) => {
                  const relativeLabel = relativeDay(group.key);
                  return <div className="timeline-group" key={group.key}>
                    <aside className="date-rail">
                      <time dateTime={group.key === "tbd" ? undefined : group.key}>
                        {formatTimelineDate(group.launches[0]?.launch_time_utc ?? null)}
                      </time>
                      {group.key !== "tbd" && <span className="date-relative">{relativeLabel}</span>}
                      <i />
                    </aside>
                    <div className="event-stack">
                      {group.key !== "tbd" && relativeLabel === "今天" && (
                        <div className="today-divider">今天 · 以下为发射计划</div>
                      )}
                      {group.launches.map((launch) => {
                        const enterIndex = newLaunchIds.indexOf(launch.external_id);
                        const href = `/launches/${launch.external_id}`;
                        return (
                          <LaunchCard
                            launch={launch}
                            key={launch.external_id}
                            isNew={enterIndex >= 0}
                            enterIndex={enterIndex}
                            isNavigating={navigationState?.href === href}
                            onNavigate={beginNavigation}
                            onCommit={commitNavigation}
                            onCancel={cancelNavigation}
                          />
                        );
                      })}
                    </div>
                  </div>;
                })
              )}
            </div>
            {!error && (showLoadMore || result.lastSyncedAt) && (
              <footer className="schedule-list-footer">
                {showLoadMore && (
                  <button className="load-more" type="button" onClick={() => void loadMore()} disabled={loading}>
                    {loadingMode === "append" && <span className="load-more-spinner" aria-hidden="true" />}
                    {loadingMode === "append" ? "正在加载…" : "加载更多发射任务"}
                  </button>
                )}
                {result.lastSyncedAt && (
                  <p className="sync-note">数据来自 Launch Library 2 · 最近同步于 {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.lastSyncedAt))}</p>
                )}
              </footer>
            )}
          </section>
          <div className={`side-column${loadingMode === "replace" ? " is-updating" : ""}`}>
            <UpcomingLaunchCard launch={hero} key={hero?.external_id ?? "upcoming-empty"} />
            <section className="next-list">
              <div className="side-heading"><strong>最近已发射 · CST</strong><span>{recentLaunches.length} 场</span></div>
              {recentLaunches.map((launch) => (
                <Link href={`/launches/${launch.external_id}`} key={launch.external_id}>
                  <strong>{formatBeijingClock(launch.launch_time_utc)}</strong>
                  <span>{formatRecentLaunchDate(launch.launch_time_utc)}</span>
                  <div><b>{launch.name_cn || launch.name}</b><small>{launch.provider || "机构待确认"} · {launch.rocket_name || "火箭待确认"}</small></div>
                  <em>—</em>
                </Link>
              ))}
              {!recentLaunches.length && <p className="next-list-empty">暂无已完成的发射记录</p>}
            </section>
          </div>
        </div>

      </section>
      <BackToTop />
    </main>
  );
}
