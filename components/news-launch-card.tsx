"use client";

import { useEffect, useState } from "react";
import { countdownParts, formatBeijingTime } from "@/lib/time";
import type { Launch } from "@/lib/types";

function Countdown({ value }: { value: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = now === null ? null : countdownParts(value, now);
  if (!parts) return <p className="news-launch-tbd">发射时间待确认</p>;
  return (
    <div className="news-launch-countdown" aria-label="下一次发射倒计时">
      {([[parts.days, "天"], [parts.hours, "时"], [parts.minutes, "分"]] as const).map(([number, label]) => (
        <span key={label}><strong>{String(number).padStart(2, "0")}</strong><small>{label}</small></span>
      ))}
    </div>
  );
}

function RocketMark() {
  return (
    <svg className="news-launch-rocket" viewBox="0 0 40 64" aria-hidden="true">
      <path d="M20 3c8 10 10 22 8 38l-8 7-8-7C10 25 12 13 20 3Z" fill="#f5f7fb" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="22" r="4" fill="#f06b24" /><path d="m12 37-7 10v10l9-6m14-14 7 10v10l-9-6M17 48l3 12 3-12" fill="#f06b24" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function NewsLaunchCard({ launch, compact = false, title }: { launch: Launch | null; compact?: boolean; title?: string }) {
  return (
    <aside className={`news-launch-card${compact ? " is-compact" : ""}`} aria-label="下一次发射">
      <h2>{title || (compact ? "关联发射任务" : "下一次发射")}</h2>
      {launch ? <>
        <div className="news-launch-identity">
          <RocketMark />
          <div><strong>{launch.name_cn || launch.name}</strong><span>{launch.rocket_name || launch.provider || "运载火箭待确认"}</span></div>
        </div>
        {!compact && <Countdown value={launch.launch_time_utc} />}
        <div className="news-launch-meta">
          <span>▣ {formatBeijingTime(launch.launch_time_utc)}（北京时间）</span>
          <span>● {launch.location_cn || launch.location || "发射地点待确认"}</span>
        </div>
        <a className="news-primary-button" href={`/launches/${launch.slug || launch.external_id}`}>查看任务详情</a>
      </> : <div className="news-launch-empty">近期发射任务暂不可用</div>}
    </aside>
  );
}
