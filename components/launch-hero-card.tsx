"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { resolveLaunchImageUrl } from "@/lib/image";
import { getLaunchStatusMeta, type LaunchStatusTone } from "@/lib/launch-status";
import { countdownParts } from "@/lib/time";
import type { Launch } from "@/lib/types";

type HeroIconName = "calendar" | "globe" | "play" | "rocket";

function HeroIcon({ name }: { name: HeroIconName }) {
  const shapes: Record<HeroIconName, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
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

function LaunchHeroCountdown({ value, tone }: { value: string | null; tone: LaunchStatusTone }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const target = value ? new Date(value).getTime() : Number.NaN;
    setNow(Date.now());
    if (tone === "success" || tone === "failed" || !Number.isFinite(target) || target <= Date.now()) return;
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

export function LaunchHeroCard({
  launch,
  titleId,
  detailHref,
}: {
  launch: Launch | null;
  titleId: string;
  detailHref?: string;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationCommitRef = useRef<number | null>(null);
  const fallbackImage = "/assets/whenliftoff/detail_rocket.jpg";
  const image = resolveLaunchImageUrl(launch?.image_url) || fallbackImage;
  const name = launch ? launch.name_cn || launch.name : "下一次发射任务待公布";
  const rocket = launch?.rocket_name || "运载火箭待确认";
  const provider = launch?.provider_cn || launch?.provider || "机构待确认";
  const providerOriginal = launch?.provider || provider;
  const status = getLaunchStatusMeta(launch?.status, launch?.status_cn);
  const primaryVideoUrl = launch?.details?.video_links?.[0]?.url ?? launch?.webcast_url;
  const primaryInfoUrl = launch?.details?.info_links?.[0]?.url ?? launch?.source_url;

  useEffect(() => () => {
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
  }, []);

  function beginDetailNavigation(event: PointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    setIsNavigating(true);
  }

  function cancelDetailNavigation(event: PointerEvent<HTMLAnchorElement>) {
    if (event.buttons !== 0) setIsNavigating(false);
  }

  function commitDetailNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!detailHref || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setIsNavigating(true);
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(detailHref);
      navigationCommitRef.current = null;
    }, 110);
  }

  return (
    <section className={`detail-hero-card${detailHref ? " home-launch-detail-card" : ""}`} aria-labelledby={titleId} aria-busy={isNavigating}>
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
      {detailHref && (
        <div className="home-launch-card-bar">
          <Link
            href={detailHref}
            onPointerDown={beginDetailNavigation}
            onPointerCancel={() => setIsNavigating(false)}
            onPointerLeave={cancelDetailNavigation}
            onClick={commitDetailNavigation}
          >
            任务详情 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
      <div className="detail-hero-copy">
        <header className="detail-title-block"><h1 id={titleId}>{name}</h1><p>{rocket}</p></header>
        <div className="provider-row">
          <span className="provider-mark"><HeroIcon name="rocket" /></span>
          <div><strong>{provider}</strong><span>{providerOriginal}</span></div>
        </div>
        <LaunchHeroCountdown value={launch?.launch_time_utc ?? null} tone={status.tone} />
        {launch && (
          <div className="detail-actions">
            {primaryVideoUrl ? (
              <a className="detail-primary-action" href={primaryVideoUrl} target="_blank" rel="noreferrer">
                <HeroIcon name="play" />{status.tone === "success" ? "观看回放" : "观看直播"}
              </a>
            ) : !detailHref && primaryInfoUrl ? (
              <a className="detail-primary-action" href={primaryVideoUrl || primaryInfoUrl || "#"} target="_blank" rel="noreferrer">
                <HeroIcon name="globe" />任务资料
              </a>
            ) : null}
            <a className="detail-secondary-action" href={calendarLink(launch, name)} target="_blank" rel="noreferrer"><HeroIcon name="calendar" />添加到日历</a>
          </div>
        )}
      </div>
      {isNavigating && (
        <span className="launch-navigation-feedback" role="status">
          <span className="launch-navigation-feedback-pill">
            <span className="launch-navigation-spinner" aria-hidden="true" />
            正在加载详情
          </span>
        </span>
      )}
    </section>
  );
}
