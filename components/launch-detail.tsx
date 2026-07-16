"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { resolveLaunchImageUrl } from "@/lib/image";
import { getLaunchStatusMeta, type LaunchStatusTone } from "@/lib/launch-status";
import { countdownParts, formatBeijingTime, formatUtcTime } from "@/lib/time";
import type { Launch } from "@/lib/types";

type DetailIconName = "calendar" | "clock" | "globe" | "pin" | "play" | "rocket";

function DetailIcon({ name }: { name: DetailIconName }) {
  const shapes: Record<DetailIconName, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>,
    rocket: <><path d="M14.5 5.5C13 3.7 12 3 12 3s-1 .7-2.5 2.5C7.8 7.6 7 10.2 7 13l5 3 5-3c0-2.8-.8-5.4-2.5-7.5Z" /><circle cx="12" cy="9" r="1.5" /><path d="M7.5 11 4 14v4l4-2M16.5 11l3.5 3v4l-4-2M10 17l2 4 2-4" /></>,
  };

  return (
    <svg className="detail-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "时间待定";
  if (!end) return `${formatDateTime(start)} CST`;
  const endClock = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(end));
  return `${formatDateTime(start)} – ${endClock} CST`;
}

function countdownLabel(value: string | null, now: number | null) {
  if (now === null) return "正在同步";
  const parts = countdownParts(value, now);
  if (!parts) return "—";
  return `T− ${parts.days > 0 ? `${parts.days}天 ` : ""}${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}:${String(parts.seconds).padStart(2, "0")}`;
}

function DetailCountdown({ value, tone }: { value: string | null; tone: LaunchStatusTone }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const target = value ? new Date(value).getTime() : Number.NaN;
    if (tone === "success" || tone === "failed" || !Number.isFinite(target) || target <= Date.now()) {
      setNow(Date.now());
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [tone, value]);

  const parts = now === null ? null : countdownParts(value, now);
  const ended = tone === "success" || tone === "failed" || (value ? new Date(value).getTime() <= (now ?? 0) : false);

  if (ended) {
    return (
      <div className="detail-countdown detail-countdown-ended">
        <span>任务进度</span>
        <strong>{tone === "failed" ? "任务已结束" : "发射已完成"}</strong>
        <small>{formatDateTime(value)} CST</small>
      </div>
    );
  }

  if (!value) {
    return <div className="detail-countdown detail-countdown-ended"><span>倒计时（北京时间）</span><strong>时间待定</strong><small>等待任务窗口确认</small></div>;
  }

  return (
    <div className="detail-countdown" aria-label="发射倒计时">
      <span>倒计时（北京时间）</span>
      <div className="detail-countdown-grid">
        {([[
          parts?.days,
          "天",
        ], [parts?.hours, "时"], [parts?.minutes, "分"], [parts?.seconds, "秒"]] as const).map(([number, label]) => (
          <div key={label}><strong>{number === undefined ? "--" : String(number).padStart(2, "0")}</strong><small>{label}</small></div>
        ))}
      </div>
    </div>
  );
}

function FactGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="fact-group"><h2>{title}</h2>{children}</div>;
}

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact-row"><span>{label}</span><strong>{children}</strong></div>;
}

function OverviewRow({ label, children, accent = false }: { label: string; children: ReactNode; accent?: boolean }) {
  return <div className="overview-row"><span>{label}</span><strong className={accent ? "overview-accent" : undefined}>{children}</strong></div>;
}

function calendarLink(launch: Launch, name: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${name} 发射`,
    details: (launch.mission_description_cn || launch.mission_description || `${launch.rocket_name || "运载火箭"}发射任务`).slice(0, 600),
    location: [launch.pad, launch.location_cn || launch.location].filter(Boolean).join(" · "),
  });
  if (launch.launch_time_utc) {
    const start = new Date(launch.launch_time_utc);
    const end = launch.window_end_utc ? new Date(launch.window_end_utc) : new Date(start.getTime() + 60 * 60 * 1000);
    const compact = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    params.set("dates", `${compact(start)}/${compact(end)}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function LaunchDetail({ launch }: { launch: Launch }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [now, setNow] = useState<number | null>(null);
  const status = getLaunchStatusMeta(launch.status, launch.status_cn);
  const image = resolveLaunchImageUrl(launch.image_url) || "/assets/whenliftoff/detail_rocket.jpg";
  const name = launch.name_cn || launch.name;
  const provider = launch.provider_cn || launch.provider || "机构待确认";
  const location = launch.location_cn || launch.location || "发射场待确认";
  const rocket = launch.rocket_name || "运载火箭待确认";
  const description = launch.mission_description_cn || launch.mission_description || "本任务的详细载荷资料仍在整理中。页面将持续同步任务窗口、运载火箭和发射场信息。";

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="app-shell detail-shell" data-theme={theme}>
      <SiteHeader active="launches" theme={theme} onThemeToggle={() => setTheme((value) => value === "light" ? "dark" : "light")} />

      <div className="detail-page">
        <nav className="detail-breadcrumb" aria-label="面包屑导航">
          <a href="/">首页</a><span>›</span><a href="/launches">发射日程</a><span>›</span><strong>{name}</strong>
        </nav>

        <div className="detail-layout">
          <article className="detail-content">
            <section className="detail-hero-card">
              <div className="detail-hero-image" role="img" aria-label={`${name} 火箭图片`} style={{ backgroundImage: `url("${image}")` }} />
              <div className="detail-hero-copy">
                <header className="detail-title-block">
                  <h1>{name}</h1>
                  <p>{rocket}</p>
                </header>

                <div className="provider-row">
                  <span className="provider-mark"><DetailIcon name="rocket" /></span>
                  <div><strong>{provider}</strong><span>{launch.provider || provider}</span></div>
                  <span className={`detail-status detail-status-${status.tone}`}>{status.label}</span>
                </div>

                <DetailCountdown value={launch.launch_time_utc} tone={status.tone} />

                <div className="detail-actions">
                  {(launch.webcast_url || launch.source_url) && (
                    <a className="detail-primary-action" href={launch.webcast_url || launch.source_url || "#"} target="_blank" rel="noreferrer">
                      <DetailIcon name={launch.webcast_url ? "play" : "globe"} />{launch.webcast_url ? (status.tone === "success" ? "观看回放" : "观看直播") : "任务资料"}
                    </a>
                  )}
                  <a className="detail-secondary-action" href={calendarLink(launch, name)} target="_blank" rel="noreferrer">
                    <DetailIcon name="calendar" />添加到日历
                  </a>
                </div>
              </div>
            </section>

            <section className="mission-facts" aria-label="任务关键数据">
              <FactGroup title="发射时间">
                <FactRow label="北京时间">{formatBeijingTime(launch.launch_time_utc)}</FactRow>
                <FactRow label="UTC">{formatUtcTime(launch.launch_time_utc)}</FactRow>
              </FactGroup>
              <FactGroup title="发射地点">
                <FactRow label="发射工位">{launch.pad || "待确认"}</FactRow>
                <FactRow label="发射场">{location}</FactRow>
              </FactGroup>
              <FactGroup title="任务信息">
                <FactRow label="任务状态">{status.label}</FactRow>
                <FactRow label="任务类型">航天器发射</FactRow>
              </FactGroup>
              <FactGroup title="运载信息">
                <FactRow label="运载火箭">{rocket}</FactRow>
                <FactRow label="目标轨道">待确认</FactRow>
              </FactGroup>
            </section>

            <section className="detail-description-card">
              <div className="detail-section-heading"><h2>任务简介</h2><span>MISSION OVERVIEW</span></div>
              <p>{description}</p>
              {launch.source_url && <a href={launch.source_url} target="_blank" rel="noreferrer">查看完整任务详情 →</a>}
            </section>
          </article>

          <aside className="detail-sidebar">
            <section className="detail-summary-card">
              <div className="detail-section-heading"><h2>任务概览</h2><span>MISSION DATA</span></div>
              <OverviewRow label="发射状态" accent>{status.label}</OverviewRow>
              <OverviewRow label="倒计时" accent>{status.tone === "success" || status.tone === "failed" ? "已结束" : countdownLabel(launch.launch_time_utc, now)}</OverviewRow>
              <OverviewRow label="发射时间">{formatDateTime(launch.launch_time_utc)} CST</OverviewRow>
              <OverviewRow label="发射地点">{launch.pad || location}</OverviewRow>
              <OverviewRow label="发射机构">{provider}</OverviewRow>
              <OverviewRow label="任务类型">航天器发射</OverviewRow>
              <OverviewRow label="轨道类型">待确认</OverviewRow>
              <OverviewRow label="运载火箭">{rocket}</OverviewRow>
              <OverviewRow label="发射窗口">{formatWindow(launch.launch_time_utc, launch.window_end_utc)}</OverviewRow>
            </section>

            <section className="detail-resource-card">
              <div className="detail-section-heading"><h2>相关信息</h2><span>RESOURCES</span></div>
              <div className="resource-list">
                {launch.webcast_url && (
                  <a href={launch.webcast_url} target="_blank" rel="noreferrer">
                    <span className="resource-thumb" style={{ backgroundImage: `url("${image}")` }} />
                    <span><strong>{name} 官方直播 / 回放</strong><small>视频 · {formatDateTime(launch.launch_time_utc)}</small></span>
                  </a>
                )}
                {launch.source_url && (
                  <a href={launch.source_url} target="_blank" rel="noreferrer">
                    <span className="resource-thumb" style={{ backgroundImage: `url("${image}")` }} />
                    <span><strong>{name} 官方任务资料</strong><small>{provider} · 数据源</small></span>
                  </a>
                )}
                {!launch.webcast_url && !launch.source_url && <p>暂无公开的任务资料。</p>}
              </div>
              <a className="detail-back-link" href="/launches">返回发射日程 →</a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
