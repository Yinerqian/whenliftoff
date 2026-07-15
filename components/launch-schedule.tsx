"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveLaunchImageUrl } from "@/lib/image";
import { getLaunchStatusMeta } from "@/lib/launch-status";
import { countdownParts, formatBeijingClock, formatBeijingDate } from "@/lib/time";
import type { Launch, LaunchResult } from "@/lib/types";

type Filters = { q: string; provider: string };
type TimelineGroup = {
  key: string;
  date: ReturnType<typeof formatBeijingDate>;
  launches: Launch[];
};

const initialFilters: Filters = { q: "", provider: "" };

function requestParams(filters: Filters, cursor?: string | null) {
  const params = new URLSearchParams({ limit: "18" });
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
      groups.set(key, { key, date: formatBeijingDate(launch.launch_time_utc), launches: [] });
    }
    groups.get(key)?.launches.push(launch);
  }
  return [...groups.values()];
}

function relativeDay(key: string) {
  if (key === "tbd") return "日期待定";
  const today = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Shanghai" }));
  const target = new Date(`${key}T00:00:00+08:00`);
  const delta = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (delta === 0) return "今天";
  if (delta === 1) return "明天";
  if (delta === 2) return "后天";
  if (delta > 0) return `${delta} 天后`;
  return `${Math.abs(delta)} 天前`;
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

function statusTone(launch: Launch) {
  return getLaunchStatusMeta(launch.status, launch.status_cn).tone;
}

function monthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
  }).format(date);
}

function UtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return <span className="utc-clock-placeholder">UTC</span>;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return (
    <span className="utc-clock" aria-label={`协调世界时 ${date} ${time}`}>
      <span>• UTC</span>
      <strong>{date}</strong>
      <b>{time}</b>
    </span>
  );
}

function Countdown({ value }: { value: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) return <div className="mini-countdown skeleton-line" />;
  const parts = countdownParts(value, now);
  if (!parts) return <div className="mini-countdown tbd-countdown">发射时间待确认</div>;
  return (
    <div className="mini-countdown" aria-label="下一次发射倒计时">
      <span className="t-minus">T−</span>
      {([
        [parts.days, "天"],
        [parts.hours, "小时"],
        [parts.minutes, "分钟"],
        [parts.seconds, "秒"],
      ] as const).map(([number, label]) => (
        <div className="mini-time" key={label}>
          <strong>{String(number).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
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

function LaunchCard({ launch }: { launch: Launch }) {
  const imageUrl = resolveLaunchImageUrl(launch.image_url);
  const status = getLaunchStatusMeta(launch.status, launch.status_cn);
  const tone = status.tone;
  return (
    <a className="launch-row" href={`/launches/${launch.external_id}`}>
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
        <i />
        <span>{status.label}</span>
      </div>
    </a>
  );
}

function UpcomingCard({ launch }: { launch: Launch | null }) {
  const imageUrl = resolveLaunchImageUrl(launch?.image_url) || "/assets/whenliftoff/hero_launch.jpg";
  return (
    <aside className="upcoming-card">
      <div className="upcoming-visual" style={{ backgroundImage: `url("${imageUrl}")` }}>
        <span className="live-pill"><i /> 即将直播</span>
      </div>
      <div className="upcoming-body">
        <p className="upcoming-meta">
          {launch?.provider || "全球任务"} · {launch?.rocket_name || "运载火箭"} · {launch?.pad || "发射台待确认"}
        </p>
        <h2>{launch ? launch.name_cn || launch.name : "下一次发射任务"}</h2>
        <Countdown value={launch?.launch_time_utc ?? null} />
        <div className="upcoming-footer">
          <span>● 概率未公布</span>
          <a href={launch ? `/launches/${launch.external_id}` : "#"}>任务详情 ↗</a>
        </div>
      </div>
    </aside>
  );
}

export function LaunchSchedule({ initial, initialError = false }: { initial: LaunchResult; initialError?: boolean }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const timeline = useMemo(() => makeTimeline(result.items), [result.items]);
  const hero = useMemo(
    () => result.items.find((launch) => launch.launch_time_utc && new Date(launch.launch_time_utc).getTime() > Date.now())
      ?? result.items.find((launch) => launch.launch_time_utc)
      ?? null,
    [result.items],
  );
  const providerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    result.items.forEach((launch) => {
      if (launch.provider) counts.set(launch.provider, (counts.get(launch.provider) || 0) + 1);
    });
    return counts;
  }, [result.items]);

  async function load(nextFilters = filters, cursor?: string | null, append = false) {
    setLoading(true);
    setError(false);
    const params = requestParams(nextFilters, cursor);
    try {
      const response = await fetch(`/api/launches?${params.toString()}`);
      if (!response.ok) throw new Error("无法加载日程");
      const data = (await response.json()) as LaunchResult;
      setResult((current) => append ? { ...data, items: [...current.items, ...data.items] } : data);
      if (!append) window.history.replaceState(null, "", `/?${params.toString()}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function selectProvider(provider: string) {
    const next = { ...filters, provider };
    setFilters(next);
    void load(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="When Liftoff 首页">
          <Image className="brand-mark" src="/assets/whenliftoff/brand-mark.png" alt="" width={30} height={30} priority />
          <span>when<b>liftoff</b></span>
        </a>
        <nav className="primary-nav" aria-label="主导航">
          <a href="#overview">首页</a>
          <a href="#schedule" className="active">发射日程</a>
          <a href="#agencies">航天机构</a>
          <a href="#rockets">火箭</a>
          <a href="#news">专题</a>
        </nav>
        <form className="top-search" onSubmit={submitSearch}>
          <span aria-hidden="true">⌕</span>
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="搜索火箭、任务、机构…"
            aria-label="搜索火箭、任务或机构"
          />
          <kbd>⌘K</kbd>
        </form>
        <UtcClock />
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          aria-label="切换主题"
        >
          ◐
        </button>
      </header>

      <section className="dashboard" id="overview">
        <h1 className="sr-only">全球火箭发射日程</h1>
        <div className="calendar-tools" id="schedule">
          <div className="month-switcher">
            <button type="button" aria-label="上一个月">‹</button>
            <strong>{monthLabel()}</strong>
            <span>· {new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Shanghai" }).format(new Date()).toUpperCase()}</span>
            <button type="button" aria-label="下一个月">›</button>
          </div>
          <button className="today-button" type="button">今天 · {new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" }).format(new Date())}</button>
          <div className="view-toggle" aria-label="日历视图">
            <button className="active" type="button">⌘ 时间线</button>
            <button type="button">▦ 月</button>
          </div>
        </div>

        <div className="filters-row" id="agencies">
          <div className="agency-filters">
            <button className={!filters.provider ? "active" : ""} type="button" onClick={() => selectProvider("")}>
              全部机构 <span>{result.items.length}</span>
            </button>
            {[...providerCounts.entries()].slice(0, 6).map(([provider, count], index) => (
              <button
                className={filters.provider === provider ? "active" : ""}
                type="button"
                key={provider}
                onClick={() => selectProvider(provider)}
              >
                <i style={{ background: ["#232323", "#e85516", "#16a67a", "#324b75", "#b18c00", "#73736a"][index] }} />
                {shortProvider(provider)} <span>{count}</span>
              </button>
            ))}
          </div>
          <form className="schedule-search" onSubmit={submitSearch}>
            <span aria-hidden="true">⌕</span>
            <input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="搜索任务 / 火箭 / 机构…"
              aria-label="在本月日历中搜索发射"
            />
          </form>
        </div>

        <div className="content-grid">
          <section className="timeline" aria-label="发射时间线">
            {error ? (
              <div className="state-card error-state">发射日程暂时不可用，请稍后重试。</div>
            ) : result.items.length === 0 && !loading ? (
              <div className="state-card">暂无符合条件的发射任务。</div>
            ) : (
              timeline.map((group) => (
                <div className="timeline-group" key={group.key}>
                  <aside className="date-rail">
                    <strong>{group.date.day}</strong>
                    <span>{group.date.month}</span>
                    <small>{relativeDay(group.key)}</small>
                    <em>{group.launches.length} 场{group.launches.every((launch) => statusTone(launch) === "success") ? " · 已结束" : ""}</em>
                    <i />
                  </aside>
                  <div className="event-stack">
                    {group.key !== "tbd" && relativeDay(group.key) === "今天" && (
                      <div className="today-divider">今天 · 以下为发射计划</div>
                    )}
                    {group.launches.map((launch) => <LaunchCard launch={launch} key={launch.external_id} />)}
                  </div>
                </div>
              ))
            )}
            {result.nextCursor && !error && (
              <button className="load-more" type="button" onClick={() => void load(filters, result.nextCursor, true)} disabled={loading}>
                {loading ? "正在加载…" : "加载更多发射任务"}
              </button>
            )}
          </section>
          <div className="side-column">
            <UpcomingCard launch={hero} />
            <section className="next-list">
              <div className="side-heading"><strong>近期窗口 · CST</strong><span>{Math.min(result.items.length, 4)} 场</span></div>
              {result.items.slice(0, 4).map((launch) => (
                <a href={`/launches/${launch.external_id}`} key={launch.external_id}>
                  <strong>{formatBeijingClock(launch.launch_time_utc)}</strong>
                  <span>{formatBeijingDate(launch.launch_time_utc).day}</span>
                  <div><b>{launch.name_cn || launch.name}</b><small>{launch.provider || "机构待确认"} · {launch.rocket_name || "火箭待确认"}</small></div>
                  <em>—</em>
                </a>
              ))}
            </section>
          </div>
        </div>

        {result.lastSyncedAt && (
          <p className="sync-note">数据来自 Launch Library 2 · 最近同步于 {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.lastSyncedAt))}</p>
        )}
      </section>
    </main>
  );
}
