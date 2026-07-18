"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { resolveLaunchImageUrl } from "@/lib/image";
import { countdownParts } from "@/lib/time";
import type { Launch } from "@/lib/types";

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

export function UpcomingLaunchCard({ launch, sourceHref }: { launch: Launch | null; sourceHref?: string }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationCommitRef = useRef<number | null>(null);
  const navigationResetRef = useRef<number | null>(null);
  const imageUrl = resolveLaunchImageUrl(launch?.image_url) || "/assets/whenliftoff/hero_launch.jpg";
  const detailHref = launch
    ? `/launches/${launch.external_id}${sourceHref ? `?from=${encodeURIComponent(sourceHref)}` : ""}`
    : null;

  useEffect(() => () => {
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
  }, []);

  function openDetail(event: MouseEvent<HTMLAnchorElement>) {
    if (!detailHref || !sourceHref || event.detail === 0 || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setIsNavigating(true);
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(detailHref);
      navigationCommitRef.current = null;
    }, 110);
    navigationResetRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      navigationResetRef.current = null;
    }, 2500);
  }

  return (
    <aside className={`upcoming-card${isNavigating ? " is-navigating" : ""}`} aria-busy={isNavigating}>
      <div className="upcoming-visual" style={{ backgroundImage: `url("${imageUrl}")` }}>
        <div className="upcoming-actions">
          <span className="next-launch-pill">下次发射</span>
          {detailHref
            ? <Link className="upcoming-detail-link" href={detailHref} onClick={openDetail}>任务详情 ↗</Link>
            : <span className="upcoming-detail-link" aria-disabled="true">任务详情 ↗</span>}
        </div>
      </div>
      <div className="upcoming-body">
        <p className="upcoming-meta">
          {launch?.provider || "全球任务"} · {launch?.rocket_name || "运载火箭"} · {launch?.pad || "发射台待确认"}
        </p>
        <h2>{launch ? launch.name_cn || launch.name : "下一次发射任务"}</h2>
        <Countdown value={launch?.launch_time_utc ?? null} />
      </div>
      {isNavigating && (
        <span className="news-navigation-feedback news-upcoming-navigation-feedback" role="status">
          <span className="news-navigation-feedback-pill">
            <span className="news-navigation-spinner" aria-hidden="true" />
            正在加载详情
          </span>
        </span>
      )}
    </aside>
  );
}
