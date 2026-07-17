"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BackToTop } from "@/components/back-to-top";
import { resolveLaunchImageUrl } from "@/lib/image";
import {
  formatTimelineOffset,
  localizeMissionType,
  localizeNetPrecision,
  localizeOrbit,
  localizeProviderType,
  selectKeyTimelineEvents,
} from "@/lib/launch-details";
import { getLaunchStatusMeta, type LaunchStatusTone } from "@/lib/launch-status";
import { countdownParts, formatBeijingTime, formatUtcTime } from "@/lib/time";
import type { Launch, LaunchTimelineEvent } from "@/lib/types";

type DetailIconName =
  | "building"
  | "calendar"
  | "clock"
  | "globe"
  | "info"
  | "landing"
  | "layers"
  | "mission"
  | "orbit"
  | "pin"
  | "play"
  | "rocket"
  | "ruler"
  | "status"
  | "weather"
  | "weight"
  | "window";

function DetailIcon({ name }: { name: DetailIconName }) {
  const shapes: Record<DetailIconName, ReactNode> = {
    building: <><path d="M4 21V8l8-4v17M12 10h8v11M7 11h2M7 15h2M7 19h2M15 13h2M15 17h2M2 21h20" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    landing: <><path d="M12 3v12M8 11l4 4 4-4M4 20h16" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    mission: <><path d="M8 3h8l3 4v14H5V7l3-4Z" /><path d="M8 3v5h8V3M9 13h6M9 17h4" /></>,
    orbit: <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-32 12 12)" /><circle cx="18.6" cy="7.5" r="1" fill="currentColor" stroke="none" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>,
    rocket: <><path d="M14.5 5.5C13 3.7 12 3 12 3s-1 .7-2.5 2.5C7.8 7.6 7 10.2 7 13l5 3 5-3c0-2.8-.8-5.4-2.5-7.5Z" /><circle cx="12" cy="9" r="1.5" /><path d="M7.5 11 4 14v4l4-2M16.5 11l3.5 3v4l-4-2M10 17l2 4 2-4" /></>,
    ruler: <><path d="m4 17 13-13 3 3L7 20H4v-3Z" /><path d="m12 9 3 3M9 12l2 2M15 6l3 3" /></>,
    status: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    weather: <><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 11.5 3.3 3.3 0 0 0 7 18Z" /><path d="M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4" /></>,
    weight: <><path d="M7 8h10l3 13H4L7 8Z" /><circle cx="12" cy="6" r="3" /></>,
    window: <><path d="M4 5h16v14H4zM4 9h16M9 9v10" /></>,
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

function formatBeijingClock(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatWindow(start: string | null | undefined, end: string | null) {
  const startClock = formatBeijingClock(start);
  const endClock = formatBeijingClock(end);
  if (!startClock && !endClock) return { primary: "待确认", secondary: "等待窗口发布" };
  const primary = startClock && endClock ? `${startClock}–${endClock} CST` : `${startClock ?? endClock} CST`;
  if (!start || !end) return { primary, secondary: "窗口时长待确认" };
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return { primary, secondary: minutes ? `持续 ${minutes} 分钟` : "瞬时窗口" };
}

function formatMetric(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return null;
  return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
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
        {([[parts?.days, "天"], [parts?.hours, "时"], [parts?.minutes, "分"], [parts?.seconds, "秒"]] as const).map(([number, label]) => (
          <div key={label}><strong>{number === undefined ? "--" : String(number).padStart(2, "0")}</strong><small>{label}</small></div>
        ))}
      </div>
    </div>
  );
}

function KeyFact({ icon, label, primary, secondary, tone }: {
  icon: DetailIconName;
  label: string;
  primary: ReactNode;
  secondary?: ReactNode;
  tone?: LaunchStatusTone;
}) {
  return (
    <div className="key-fact">
      <span className="key-fact-icon"><DetailIcon name={icon} /></span>
      <div><span>{label}</span><strong className={tone ? `fact-tone-${tone}` : undefined}>{primary}</strong>{secondary && <small>{secondary}</small>}</div>
    </div>
  );
}

function SectionHeading({ title, eyebrow }: { title: string; eyebrow: string }) {
  return <div className="detail-section-heading"><h2>{title}</h2><span>{eyebrow}</span></div>;
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

function timelineIcon(event: LaunchTimelineEvent): DetailIconName {
  if (/Landing/i.test(event.code)) return "landing";
  if (/Separation|MECO|SECO/i.test(event.code)) return "layers";
  if (/Liftoff|Ignition/i.test(event.code)) return "rocket";
  if (/Max-Q/i.test(event.code)) return "orbit";
  return "clock";
}

function TimelineList({ events }: { events: LaunchTimelineEvent[] }) {
  return (
    <ol className="vertical-timeline">
      {events.map((event) => (
        <li key={`${event.offset_seconds}-${event.code}`} className={`timeline-event timeline-${event.phase}${event.code === "Liftoff" ? " timeline-liftoff" : ""}${event.is_key_event ? " timeline-key" : ""}`}>
          <time>{formatTimelineOffset(event.offset_seconds)}</time>
          <span className="timeline-node"><DetailIcon name={timelineIcon(event)} /></span>
          <div><strong>{event.title}</strong>{event.description && <p>{event.description}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

export function LaunchDetail({ launch, newsReturnPath = null }: { launch: Launch; newsReturnPath?: string | null }) {
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const status = getLaunchStatusMeta(launch.status, launch.status_cn);
  const details = launch.details;
  const fallbackImage = "/assets/whenliftoff/detail_rocket.jpg";
  const image = resolveLaunchImageUrl(launch.image_url) || fallbackImage;
  const name = launch.name_cn || launch.name;
  const provider = launch.provider_cn || launch.provider || "机构待确认";
  const location = launch.location_cn || launch.location || "发射场待确认";
  const rocket = launch.rocket_name || "运载火箭待确认";
  const description = launch.mission_description_cn || launch.mission_description || "本任务的详细载荷资料仍在整理中。页面将持续同步任务窗口、运载火箭和发射场信息。";
  const launchWindow = formatWindow(details?.window_start_utc, launch.window_end_utc);
  const missionType = localizeMissionType(details?.mission_type) || "待确认";
  const orbit = localizeOrbit(details?.orbit_name, details?.orbit_abbrev) || "待确认";
  const providerType = localizeProviderType(details?.provider_type);
  const videos = details?.video_links ?? [];
  const primaryVideo = videos[0];
  const primaryVideoUrl = primaryVideo?.url ?? launch.webcast_url;
  const infoLinks = details?.info_links ?? [];
  const primaryInfoUrl = infoLinks[0]?.url ?? launch.source_url;
  const allTimeline = details?.timeline ?? [];
  const keyTimeline = selectKeyTimelineEvents(allTimeline);
  const visibleTimeline = showFullTimeline ? allTimeline : keyTimeline;
  const mapImage = details?.map_image_url;
  const mapUrl = details?.map_url;

  const advancedFacts = [
    details?.rocket_variant ? ["火箭构型", details.rocket_variant] : null,
    details?.rocket_min_stage || details?.rocket_max_stage
      ? ["火箭级数", details.rocket_min_stage === details.rocket_max_stage ? `${details.rocket_min_stage} 级` : `${details.rocket_min_stage ?? "?"}–${details.rocket_max_stage ?? "?"} 级`]
      : null,
    details?.rocket_length_m || details?.rocket_diameter_m
      ? ["尺寸", [formatMetric(details.rocket_length_m, "m"), details.rocket_diameter_m ? `直径 ${formatMetric(details.rocket_diameter_m, "m")}` : null].filter(Boolean).join(" · ")]
      : null,
    details?.rocket_launch_mass_t ? ["起飞质量", formatMetric(details.rocket_launch_mass_t, "吨")] : null,
    details?.rocket_leo_capacity_kg ? ["LEO 运力", formatMetric(details.rocket_leo_capacity_kg, "kg")] : null,
    details?.rocket_gto_capacity_kg ? ["GTO 运力", formatMetric(details.rocket_gto_capacity_kg, "kg")] : null,
    details?.booster_serial ? ["助推器", `${details.booster_serial}${details.booster_flight_number ? ` · 第 ${details.booster_flight_number} 次飞行` : ""}`] : null,
    details?.rocket_reusable !== null && details?.rocket_reusable !== undefined ? ["复用能力", details.rocket_reusable ? "支持复用" : "不可复用"] : null,
    details?.landing_attempt ? ["回收计划", [details.landing_location, details.landing_type].filter(Boolean).join(" · ") || "计划尝试回收"] : null,
  ].filter((fact): fact is [string, string] => Boolean(fact?.[1]));

  return (
    <main className="launch-detail-route-main">
      <div className="detail-page launch-page-content">
        <nav className="detail-breadcrumb" aria-label="面包屑导航">
          {newsReturnPath ? <>
            <Link href="/news">航天新闻</Link><span aria-hidden="true">›</span>
            {newsReturnPath !== "/news" && <><Link href={newsReturnPath}>新闻详情</Link><span aria-hidden="true">›</span></>}
          </> : <><Link href="/launches">发射日程</Link><span aria-hidden="true">›</span></>}
          <strong aria-current="page">发射详情 · {name}</strong>
        </nav>

        <section className="detail-hero-card">
          <img
            className="detail-hero-image"
            src={image}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            onError={(event) => {
              if (event.currentTarget.dataset.fallback === "true") return;
              event.currentTarget.dataset.fallback = "true";
              event.currentTarget.src = fallbackImage;
            }}
          />
          <div className="detail-hero-copy">
            <header className="detail-title-block"><h1>{name}</h1><p>{rocket}</p></header>
            <div className="provider-row">
              <span className="provider-mark"><DetailIcon name="rocket" /></span>
              <div><strong>{provider}</strong><span>{launch.provider || provider}</span></div>
            </div>
            <DetailCountdown value={launch.launch_time_utc} tone={status.tone} />
            <div className="detail-actions">
              {(primaryVideoUrl || primaryInfoUrl) && (
                <a className="detail-primary-action" href={primaryVideoUrl || primaryInfoUrl || "#"} target="_blank" rel="noreferrer">
                  <DetailIcon name={primaryVideoUrl ? "play" : "globe"} />{primaryVideoUrl ? (status.tone === "success" ? "观看回放" : "观看直播") : "任务资料"}
                </a>
              )}
              <a className="detail-secondary-action" href={calendarLink(launch, name)} target="_blank" rel="noreferrer"><DetailIcon name="calendar" />添加到日历</a>
            </div>
          </div>
        </section>

        <div className="detail-layout">
          <article className="detail-content">
            <section className="detail-description-card">
              <SectionHeading title="任务简介" eyebrow="MISSION OVERVIEW" />
              <p>{description}</p>
              {primaryInfoUrl && <a href={primaryInfoUrl} target="_blank" rel="noreferrer">查看完整任务详情 →</a>}
            </section>

            <section className="mission-facts" aria-label="任务关键数据">
              <SectionHeading title="任务关键信息" eyebrow="MISSION DATA" />
              <div className="key-facts-grid">
                <KeyFact icon="calendar" label="发射时间" primary={`${formatDateTime(launch.launch_time_utc)} CST`} secondary={formatUtcTime(launch.launch_time_utc)} />
                <KeyFact icon="window" label="发射窗口" primary={launchWindow.primary} secondary={launchWindow.secondary} />
                <KeyFact icon="status" label="当前状态" primary={status.label} secondary={details?.net_precision ? `时间精度：${localizeNetPrecision(details.net_precision)}` : undefined} tone={status.tone} />
                <KeyFact icon="pin" label="发射地点" primary={launch.pad || "待确认"} secondary={location} />
                <KeyFact icon="mission" label="任务类型" primary={missionType} secondary={details?.mission_type && missionType !== details.mission_type ? details.mission_type : undefined} />
                <KeyFact icon="orbit" label="目标轨道" primary={orbit} secondary={details?.orbit_abbrev ? `${details.orbit_name ?? orbit} · ${details.orbit_abbrev}` : details?.orbit_name} />
                <KeyFact icon="building" label="发射机构" primary={provider} secondary={[launch.provider, providerType].filter(Boolean).join(" · ")} />
                <KeyFact icon="rocket" label="运载火箭" primary={rocket} secondary={details?.rocket_manufacturer || details?.rocket_variant} />
                {(details?.probability !== null && details?.probability !== undefined || details?.weather_concerns) && (
                  <KeyFact icon="weather" label="天气条件" primary={details?.probability !== null && details?.probability !== undefined ? `${details.probability}% 可发射` : "存在天气关注项"} secondary={details?.weather_concerns} />
                )}
              </div>
              {advancedFacts.length > 0 && (
                <details className="technical-details">
                  <summary><span><DetailIcon name="info" />查看运载与回收详情</span><i aria-hidden="true">⌄</i></summary>
                  <div className="technical-grid">
                    {advancedFacts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
                  </div>
                  {details?.landing_description && <p>{details.landing_description}</p>}
                </details>
              )}
            </section>

            {allTimeline.length > 0 && (
              <section className="detail-timeline-card">
                <SectionHeading title="飞行时间线" eyebrow="任务进程" />
                <TimelineList events={visibleTimeline} />
                {allTimeline.length > keyTimeline.length && (
                  <button className="timeline-toggle" type="button" aria-expanded={showFullTimeline} onClick={() => setShowFullTimeline((value) => !value)}>
                    {showFullTimeline ? "收起完整时间线" : `查看完整时间线（${allTimeline.length} 个节点）`}<span aria-hidden="true">{showFullTimeline ? "↑" : "↓"}</span>
                  </button>
                )}
              </section>
            )}
          </article>

          <aside className="detail-sidebar">
            <section className="detail-live-card">
              <SectionHeading title={primaryVideoUrl ? "官方直播" : "任务直播"} eyebrow="LIVE & REPLAY" />
              {primaryVideoUrl ? (
                <>
                  <a className="live-preview" href={primaryVideoUrl} target="_blank" rel="noreferrer" style={{ backgroundImage: `url("${primaryVideo?.feature_image || image}")` }}>
                    <span><DetailIcon name="play" /></span>
                  </a>
                  <div className="live-copy"><strong>{primaryVideo?.title || `${name} 官方直播`}</strong><span>{primaryVideo?.publisher || primaryVideo?.source || provider}</span>{primaryVideo?.start_time && <small>预计开始：{formatDateTime(primaryVideo.start_time)} CST</small>}</div>
                  <a className="live-action" href={primaryVideoUrl} target="_blank" rel="noreferrer"><DetailIcon name="play" />{status.tone === "success" ? "观看回放" : "观看直播"}</a>
                  {videos.length > 1 && (
                    <details className="more-streams"><summary>更多直播源（{videos.length - 1}）<span aria-hidden="true">⌄</span></summary><div>{videos.slice(1).map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer"><strong>{video.publisher || video.source || "视频来源"}</strong><small>{video.type || video.language || "直播 / 回放"}</small></a>)}</div></details>
                  )}
                </>
              ) : <p className="detail-empty">暂无公开直播地址，任务资料更新后会自动显示。</p>}
            </section>

            <section className="detail-map-card">
              <SectionHeading title="发射地点" eyebrow="LAUNCH SITE" />
              {mapUrl ? (
                <a className={`map-preview${mapImage ? " has-map-image" : ""}`} href={mapUrl} target="_blank" rel="noreferrer" style={mapImage ? { backgroundImage: `url("${mapImage}")` } : undefined}>
                  <span className="map-pin"><DetailIcon name="pin" /></span><span className="map-open">查看地图 ↗</span>
                </a>
              ) : <div className="map-preview"><span className="map-pin"><DetailIcon name="pin" /></span></div>}
              <div className="map-copy"><strong>{launch.pad || "发射工位待确认"}</strong><span>{location}</span>{details?.latitude !== null && details?.latitude !== undefined && details?.longitude !== null && details?.longitude !== undefined && <small>{details.latitude.toFixed(4)}°, {details.longitude.toFixed(4)}°</small>}</div>
            </section>

            <section className="detail-resource-card">
              <SectionHeading title="相关资源" eyebrow="RESOURCES" />
              <div className="resource-list">
                {infoLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer"><span className="resource-thumb" style={{ backgroundImage: `url("${link.feature_image || details?.mission_patch_url || image}")` }} /><span><strong>{link.title || `${name} 官方任务资料`}</strong><small>{link.source || link.type || provider}</small></span></a>)}
                {details?.flightclub_url && <a href={details.flightclub_url} target="_blank" rel="noreferrer"><span className="resource-icon"><DetailIcon name="orbit" /></span><span><strong>查看任务轨迹模拟</strong><small>Flight Club · 外部资源</small></span></a>}
                {details?.infographic_url && <a href={details.infographic_url} target="_blank" rel="noreferrer"><span className="resource-thumb" style={{ backgroundImage: `url("${details.infographic_url}")` }} /><span><strong>任务信息图</strong><small>高清图片</small></span></a>}
                {!infoLinks.length && !details?.flightclub_url && !details?.infographic_url && primaryInfoUrl && <a href={primaryInfoUrl} target="_blank" rel="noreferrer"><span className="resource-icon"><DetailIcon name="globe" /></span><span><strong>任务数据来源</strong><small>{provider}</small></span></a>}
                {!primaryInfoUrl && !details?.flightclub_url && !details?.infographic_url && <p>暂无公开的任务资料。</p>}
              </div>
              <Link className="detail-back-link" href="/launches">返回发射日程 →</Link>
            </section>
          </aside>
        </div>
      </div>
      <BackToTop />
    </main>
  );
}
