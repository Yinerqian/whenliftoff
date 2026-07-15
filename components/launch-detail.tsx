"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { resolveLaunchImageUrl } from "@/lib/image";
import { getLaunchStatusMeta } from "@/lib/launch-status";
import { formatBeijingClock, formatBeijingTime, formatUtcTime } from "@/lib/time";
import type { Launch } from "@/lib/types";

const flightTimeline = [
  { time: "T−35:00", title: "推进剂加注开始", en: "Prop Load", detail: "一级煤油与液氧加注程序开始" },
  { time: "T−07:00", title: "发动机预冷", en: "Engine Chill", detail: "发动机进入发射前热状态准备" },
  { time: "T−01:00", title: "自动倒数启动", en: "Startup", detail: "飞行计算机接管最后检查与倒计时" },
  { time: "T−00:03", title: "主发动机点火", en: "Ignition", detail: "发动机点火序列启动" },
  { time: "T+00:00", title: "升空", en: "Liftoff", detail: "运载火箭离开发射台" },
  { time: "T+02:30", title: "一级关机与级间分离", en: "MECO / Stage Sep", detail: "一级发动机关机，二级与一级分离" },
  { time: "T+08:30", title: "一级着陆", en: "Stage 1 Landing", detail: "一级完成返回与着陆程序" },
  { time: "T+09:00", title: "二级发动机关机", en: "SECO", detail: "二级进入预定滑行阶段" },
  { time: "T+60:00", title: "载荷部署", en: "Payload Deploy", detail: "任务载荷进入目标轨道" },
];

function formatDate(value: string | null, withYear = false) {
  if (!value) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    ...(withYear ? { year: "numeric" as const } : {}),
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "待确认";
  if (!end) return `${formatDate(start)} CST`;
  const duration = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const minutes = Math.round(duration / 60_000);
  const span = minutes >= 60 ? `${Math.round(minutes / 60)} 小时` : `${minutes} 分钟`;
  return `${formatDate(start)} – ${formatBeijingClock(end)} CST · ${span}`;
}

function DetailUtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return <span className="utc-clock-placeholder">UTC</span>;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "2-digit", day: "2-digit" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  return <span className="utc-clock"><span>• UTC</span><strong>{date}</strong><b>{time}</b></span>;
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="detail-data-row"><span>{label}</span><strong>{children}</strong></div>;
}

export function LaunchDetail({ launch }: { launch: Launch }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const status = getLaunchStatusMeta(launch.status, launch.status_cn);
  const tone = status.tone;
  const image = resolveLaunchImageUrl(launch.image_url) || "/assets/whenliftoff/detail_rocket.jpg";
  const name = launch.name_cn || launch.name;
  const provider = launch.provider_cn || launch.provider || "机构待确认";
  const location = launch.location_cn || launch.location || "发射场待确认";
  const description = launch.mission_description_cn || launch.mission_description || "本任务的详细载荷资料仍在整理中。页面将持续同步任务窗口、运载火箭和发射场信息。";
  const successful = tone === "success";
  const updates = useMemo(() => [
    { time: launch.synced_at, title: "任务数据已同步", text: `任务状态更新为“${status.label}”。` },
    { time: launch.api_updated_at, title: "发射窗口更新", text: `${formatUtcTime(launch.launch_time_utc)} · ${formatBeijingTime(launch.launch_time_utc)}` },
    { time: launch.launch_time_utc, title: successful ? "任务结果记录" : "当前目标发射时间", text: successful ? "任务已按数据源记录完成，载荷进入后续任务阶段。" : "发射时间可能受天气、技术状态与空域安排影响。" },
  ].filter((item) => item.time), [launch, status.label, successful]);

  return (
    <main className="app-shell detail-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="When Liftoff 首页"><Image className="brand-mark" src="/assets/whenliftoff/brand-mark.png" alt="" width={30} height={30} priority /><span>when<b>liftoff</b></span></a>
        <nav className="primary-nav" aria-label="主导航">
          <a href="/">首页</a>
          <a className="active" href="/">发射日程</a>
          <a href="/#agencies">航天机构</a>
          <a href="/#rockets">火箭</a>
          <a href="/#news">专题</a>
        </nav>
        <form className="top-search" action="/" method="get">
          <span aria-hidden="true">⌕</span><input name="q" placeholder="搜索火箭、任务、机构…" aria-label="搜索" /><kbd>⌘K</kbd>
        </form>
        <DetailUtcClock />
        <button className="theme-toggle" type="button" onClick={() => setTheme((value) => value === "light" ? "dark" : "light")} aria-label="切换主题">◐</button>
      </header>

      <div className="detail-page">
        <div className={`mission-alert mission-alert-${tone}`}>
          <div className="mission-alert-icon">{successful ? "✓" : tone === "failed" ? "×" : "↑"}</div>
          <div><strong>{successful ? "任务成功" : status.label}</strong><span>{successful ? "载荷已完成部署入轨。" : "正在等待新的任务状态更新。"}</span></div>
          <div className="mission-alert-time"><strong>{formatBeijingClock(launch.launch_time_utc)}</strong><span>{formatDate(launch.launch_time_utc).split(" ")[0]} CST</span></div>
          {launch.webcast_url && <a href={launch.webcast_url} target="_blank" rel="noreferrer">▶ {successful ? "录播" : "直播"}</a>}
        </div>

        <div className="detail-grid">
          <article className="detail-main">
            <div className="mission-heading">
              <span>任务档案 · MISSION</span>
              <h1>{name}</h1>
              <p>{provider} · {launch.rocket_name || "运载火箭待确认"} · {launch.pad || "发射工位待确认"}</p>
            </div>

            <div className="mission-hero" style={{ backgroundImage: `url("${image}")` }}>
              <span className={`hero-status hero-status-${tone}`}>{status.label}</span>
              <div className="hero-caption"><span>{provider}</span><strong>{launch.rocket_name || name}</strong></div>
            </div>

            <section className="detail-section intro-section">
              <div className="section-title-row"><h2>任务简介</h2><span>MISSION OVERVIEW</span></div>
              <p>{description}</p>
              <div className="detail-links">
                {launch.source_url && <a href={launch.source_url} target="_blank" rel="noreferrer">↗ 官方任务资料</a>}
                {launch.webcast_url && <a href={launch.webcast_url} target="_blank" rel="noreferrer">▶ 观看直播 / 录播</a>}
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title-row"><h2>典型飞行时间线</h2><span>FLIGHT TIMELINE · {flightTimeline.length} 节点</span></div>
              <div className="flight-timeline">
                {flightTimeline.map((item, index) => (
                  <div className={`flight-node ${successful ? "completed" : index === 4 ? "current" : ""}`} key={item.time}>
                    <time>{item.time}</time><i />
                    <div><strong>{item.title}</strong><span>{item.en}</span><p>{item.detail}</p></div>
                  </div>
                ))}
              </div>
              <p className="timeline-note">时间线为同型任务的典型飞行流程，实际节点以官方任务资料为准。</p>
            </section>

            <section className="detail-section">
              <div className="section-title-row"><h2>任务更新</h2><span>{updates.length} 条 · MISSION LOG</span></div>
              <div className="mission-updates">
                {updates.map((update) => (
                  <div className="update-row" key={`${update.title}-${update.time}`}>
                    <time><strong>{formatBeijingClock(update.time)}</strong><span>{formatDate(update.time).split(" ")[0]}</span></time>
                    <i />
                    <div><small>whenliftoff · 数据同步</small><strong>{update.title}</strong><p>{update.text}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </article>

          <aside className="detail-sidebar">
            <section className="detail-panel mission-data">
              <div className="panel-heading"><h2>任务信息</h2><span>MISSION DATA</span></div>
              <DataRow label="机构">{provider}</DataRow>
              <DataRow label="火箭">{launch.rocket_name || "待确认"}</DataRow>
              <DataRow label="发射工位">{launch.pad || "待确认"}</DataRow>
              <DataRow label="发射场">{location}</DataRow>
              <DataRow label="目标轨道">待确认</DataRow>
              <DataRow label="发射窗口">{formatWindow(launch.launch_time_utc, launch.window_end_utc)}</DataRow>
              <DataRow label="状态"><span className={`data-status data-status-${tone}`}>● {status.label}</span></DataRow>
            </section>

            <section className="detail-panel location-panel">
              <div className="panel-heading"><h2>发射场位置</h2><span>LAUNCH SITE</span></div>
              <div className="map-card">
                <span className="map-grid" />
                <span className="map-coast" />
                <i className="map-pin">●</i>
                <div><strong>{launch.pad || "发射工位"}</strong><span>{location}</span></div>
              </div>
              <p>{location}</p>
            </section>

            <section className="detail-panel mission-patch-panel">
              <div className="panel-heading"><h2>任务徽章</h2><span>MISSION PATCH</span></div>
              <div className="patch-visual"><span className="patch-orbit" /><strong>WL</strong><small>{(launch.rocket_name || "MISSION").slice(0, 18)}</small></div>
            </section>

            <section className="detail-panel source-panel">
              <div className="panel-heading"><h2>直播 / 任务源</h2><span>SOURCES</span></div>
              {launch.webcast_url && <a href={launch.webcast_url} target="_blank" rel="noreferrer">▶ 官方直播 / 录播 <span>↗</span></a>}
              {launch.source_url && <a href={launch.source_url} target="_blank" rel="noreferrer">↗ 数据源任务页 <span>↗</span></a>}
              {!launch.webcast_url && !launch.source_url && <p>暂无公开任务源。</p>}
            </section>

            <a className="back-link" href="/">← 返回发射日程</a>
          </aside>
        </div>
      </div>
    </main>
  );
}
