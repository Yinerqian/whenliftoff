import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChartAvatar } from "@/components/chart-avatar";
import { HomeLatestNews } from "@/components/home-latest-news";
import { LaunchHeroCard } from "@/components/launch-hero-card";
import type { NewsListItem } from "@/lib/news-types";
import type { HomeLaunchStats, HomeMonthlyLaunchStat, Launch } from "@/lib/types";

type HomeIconName = "rocket" | "check" | "target" | "users" | "globe" | "pad" | "calendar";

function HomeIcon({ name }: { name: HomeIconName }) {
  const paths: Record<HomeIconName, ReactNode> = {
    rocket: <><path d="M14.5 4.4c2.4-1.1 4.3-.9 5.1-.6.3.8.5 2.7-.6 5.1l-4.2 4.2-4.5-4.5 4.2-4.2Z"/><path d="m9.8 9.1-4.3.7-2 2 4.1 1.1M14.3 13.6l-.7 4.3-2 2-1.1-4.1"/><circle cx="15.8" cy="7.6" r="1.3"/><path d="M7.3 16.1c-1.2.2-2.8 1.3-3.1 3.3 2-.3 3.1-1.9 3.3-3.1"/></>,
    check: <><circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.5 2.5 5.2-5.4"/></>,
    target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M21 12h-3"/></>,
    users: <><path d="M8.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.8 11a2.4 2.4 0 1 0 0-4.8"/><path d="M3.5 19v-1.4c0-2.4 2-4.3 4.3-4.3h1.4c2.4 0 4.3 2 4.3 4.3V19M15 13.2c3.2-.5 5.5 1.3 5.5 4.1V19"/></>,
    globe: <><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z"/></>,
    pad: <><path d="M5 20h14M8 20v-5h8v5M10 15V8h4v7M12 8V3M9 11h6"/></>,
    calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></>,
  };
  return <svg className="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatPeriod(stats: HomeLaunchStats | null) {
  if (!stats) return "本年迄今";
  const start = stats.period_start.slice(0, 7).replace("-", ".");
  const endDate = new Date(stats.period_end);
  const end = `${endDate.getUTCFullYear()}.${String(endDate.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${start}—${end}`;
}

function formatUpdated(value: string | null | undefined) {
  if (!value) return "等待首次统计同步";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function isStale(value: string | null | undefined) {
  return value ? Date.now() - Date.parse(value) > 48 * 60 * 60 * 1000 : false;
}

function KpiCard({ icon, label, value, suffix }: { icon: HomeIconName; label: string; value: string | number; suffix?: string }) {
  return (
    <article className="home-kpi-card">
      <span className="home-kpi-icon"><HomeIcon name={icon} /></span>
      <div><span>{label}</span><strong>{value}{suffix && <small>{suffix}</small>}</strong></div>
    </article>
  );
}

type Point = { x: number; y: number; value: number };

function smoothPath(points: Point[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? point;
    const cp1x = previous.x + (point.x - beforePrevious.x) / 6;
    const cp1y = previous.y + (point.y - beforePrevious.y) / 6;
    const cp2x = point.x - (next.x - previous.x) / 6;
    const cp2y = point.y - (next.y - previous.y) / 6;
    return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");
}

function MonthlyChart({ values }: { values: HomeMonthlyLaunchStat[] }) {
  const width = 720;
  const height = 300;
  const left = 44;
  const right = 20;
  const top = 28;
  const bottom = 52;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(10, ...values.flatMap((item) => [item.total, item.successful]));
  const roundedMax = Math.ceil(maxValue / 10) * 10;
  const toPoints = (key: "total" | "successful") => values.map((item, index) => ({
    x: left + (index / Math.max(values.length - 1, 1)) * chartWidth,
    y: top + chartHeight - (item[key] / roundedMax) * chartHeight,
    value: item[key],
  }));
  const total = toPoints("total");
  const successful = toPoints("successful");
  const totalPath = smoothPath(total);
  const successPath = smoothPath(successful);
  const totalArea = total.length ? `${totalPath} L ${total.at(-1)?.x} ${top + chartHeight} L ${total[0].x} ${top + chartHeight} Z` : "";
  const best = values.reduce((current, value) => value.total > current.total ? value : current, values[0] ?? { month: "--", total: 0, successful: 0 });

  return (
    <figure className="home-chart-card home-monthly-card" aria-labelledby="home-monthly-title">
      <header className="home-chart-heading">
        <div><h3 id="home-monthly-title">月度发射趋势</h3><p>峰值出现在 {best.month.replace("-", " 年 ")} 月，共 {best.total} 次</p></div>
        <div className="home-chart-legend"><span className="is-total">发射总数</span><span className="is-success">成功发射</span></div>
      </header>
      {values.length ? (
        <svg className="home-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="本年度各月发射总数和成功发射次数折线图">
          <defs>
            <linearGradient id="home-total-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#336fe8" stopOpacity=".2"/><stop offset="1" stopColor="#336fe8" stopOpacity="0"/></linearGradient>
          </defs>
          {[0, .25, .5, .75, 1].map((ratio) => {
            const y = top + ratio * chartHeight;
            const label = Math.round(roundedMax * (1 - ratio));
            return <g key={ratio}><line className="home-chart-gridline" x1={left} x2={width - right} y1={y} y2={y}/><text className="home-chart-y-label" x={left - 11} y={y + 4}>{label}</text></g>;
          })}
          <path className="home-chart-area" d={totalArea} />
          <path className="home-chart-line is-total" d={totalPath} />
          <path className="home-chart-line is-success" d={successPath} />
          {total.map((point, index) => <g key={`total-${values[index].month}`}><circle className="home-chart-dot is-total" cx={point.x} cy={point.y} r="3.6"/><text className="home-chart-value is-total" x={point.x} y={point.y - 11}>{point.value}</text></g>)}
          {successful.map((point, index) => <g key={`success-${values[index].month}`}><circle className="home-chart-dot is-success" cx={point.x} cy={point.y} r="3"/><text className="home-chart-value is-success" x={point.x} y={point.y + 17}>{point.value}</text></g>)}
          {values.map((item, index) => <text key={item.month} className="home-chart-x-label" x={total[index].x} y={height - 18}>{item.month.slice(5)}月</text>)}
        </svg>
      ) : <ChartEmpty />}
      <figcaption className="sr-only">按月份对比全部发射与成功发射次数。</figcaption>
    </figure>
  );
}

function ChartEmpty() {
  return <div className="home-chart-empty">统计快照将在下一次同步后显示</div>;
}

function ProviderChart({ stats }: { stats: HomeLaunchStats | null }) {
  const values = stats?.providers ?? [];
  const max = Math.max(1, ...values.map((item) => item.count));
  const colors = ["#ff5a2b", "#3977eb", "#16a085", "#7c5ce0", "#e3a41a", "#0f8ea8", "#d65076", "#5b6b7c", "#7aaa24", "#9b59b6"];
  return (
    <figure className="home-chart-card home-ranking-card" aria-labelledby="home-provider-title">
      <header className="home-chart-heading"><div><h3 id="home-provider-title">发射机构 Top 10</h3><p>{values[0] ? `${values[0].abbrev || values[0].name} 以 ${values[0].share}% 位居首位` : "按发射次数排序"}</p></div></header>
      {values.length ? <ol className="home-ranking-list">{values.map((item, index) => (
        <li key={item.name} style={{ "--home-row-color": colors[index % colors.length] } as CSSProperties}>
          <span className="home-chart-avatar home-provider-avatar" data-tooltip={item.name} aria-label={item.name} tabIndex={0}>
            <ChartAvatar src={item.image_url} fallback={(item.abbrev || item.name).slice(0, 2).toUpperCase()} imageClassName="is-logo" />
            <small>{index + 1}</small>
          </span>
          <strong>{item.abbrev || item.name}</strong>
          <span className="home-ranking-track"><i style={{ "--home-bar": `${(item.count / max) * 100}%` } as CSSProperties}/></span>
          <b>{item.count}</b><small>{item.share}%</small>
        </li>
      ))}</ol> : <ChartEmpty />}
      <figcaption className="sr-only">本年度发射次数最多的十家机构。</figcaption>
    </figure>
  );
}

const countryNames: Record<string, string> = { USA: "美国", US: "美国", CHN: "中国", CN: "中国", RUS: "俄罗斯", RU: "俄罗斯", IND: "印度", IN: "印度", JPN: "日本", JP: "日本", FRA: "法国", FR: "法国", NZL: "新西兰", NZ: "新西兰", KAZ: "哈萨克斯坦", KZ: "哈萨克斯坦", OTH: "其他" };
const countryMarks: Record<string, string> = { USA: "美", US: "美", CHN: "中", CN: "中", RUS: "俄", RU: "俄", IND: "印", IN: "印", JPN: "日", JP: "日", FRA: "法", FR: "法", NZL: "新", NZ: "新", KAZ: "哈", KZ: "哈", GUF: "圭", OTH: "其" };

function CountryChart({ stats }: { stats: HomeLaunchStats | null }) {
  const values = stats?.countries ?? [];
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <figure className="home-chart-card home-country-card" aria-labelledby="home-country-title">
      <header className="home-chart-heading"><div><h3 id="home-country-title">发射国家 / 地区</h3><p>{values[0] ? `${countryNames[values[0].code] || values[0].name}贡献 ${values[0].share}% 的发射` : "按发射地点统计"}</p></div></header>
      {values.length ? <div className="home-country-chart">{values.map((item, index) => (
        <div className={`home-country-column is-${index + 1}`} key={item.code} title={`${item.name}: ${item.count}`}>
          <strong>{item.count}</strong>
          <span><i style={{ "--home-column": `${Math.max(8, (item.count / max) * 100)}%` } as CSSProperties}/></span>
          <b className="home-chart-avatar home-country-avatar" data-tooltip={countryNames[item.code] || item.name} aria-label={countryNames[item.code] || item.name} tabIndex={0}>
            <ChartAvatar src={item.flag_url} fallback={countryMarks[item.code] || item.code.slice(0, 1)} imageClassName="is-flag" />
          </b>
          <small>{item.code}</small>
        </div>
      ))}</div> : <ChartEmpty />}
      <figcaption className="sr-only">按发射地点所在国家或地区统计发射次数。</figcaption>
    </figure>
  );
}

function RocketChart({ stats }: { stats: HomeLaunchStats | null }) {
  const values = stats?.rockets ?? [];
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <figure className="home-chart-card home-rocket-chart-card" aria-labelledby="home-rocket-title">
      <header className="home-chart-heading"><div><h3 id="home-rocket-title">主力火箭型号</h3><p>{values[0] ? `${values[0].name} 执行 ${values[0].count} 次任务` : "按火箭配置统计"}</p></div></header>
      {values.length ? <ol className="home-rocket-ranking">{values.map((item, index) => (
        <li key={item.name} title={item.name}>
          <span>{index + 1}</span><i className="home-chart-avatar home-rocket-avatar" data-tooltip={item.name} aria-label={item.name} tabIndex={0}><ChartAvatar src={item.image_url} fallback="🚀" imageClassName="is-rocket" /></i><strong>{item.name}</strong>
          <span className="home-lollipop"><i style={{ "--home-bar": `${(item.count / max) * 100}%` } as CSSProperties}/><b style={{ "--home-left": `${(item.count / max) * 100}%` } as CSSProperties}/></span>
          <em>{item.count}</em><small>{item.share}%</small>
        </li>
      ))}</ol> : <ChartEmpty />}
      <figcaption className="sr-only">本年度使用次数最多的火箭型号。</figcaption>
    </figure>
  );
}

export function HomePageView({ launch, stats, news }: { launch: Launch | null; stats: HomeLaunchStats | null; news: NewsListItem | null }) {
  const launchHref = launch ? `/launches/${launch.external_id}?from=%2F` : "/launches";
  const statValue = (value: number | undefined, suffix = "") => value === undefined ? "--" : `${value}${suffix}`;
  const stale = isStale(stats?.generated_at);
  const statisticsYear = stats ? new Date(stats.period_start).getUTCFullYear() : new Date().getUTCFullYear();

  return (
    <main className="home-page">
      <LaunchHeroCard launch={launch} titleId="home-launch-title" detailHref={launchHref} />

      <section className="home-news home-news-after-launch" aria-labelledby="home-news-title">
        <HomeLatestNews news={news} />
      </section>

      <section className="home-kpis" aria-labelledby="home-kpis-title">
        <div className="home-section-line"><h2 id="home-kpis-title">{statisticsYear} 年迄今</h2><p className={stale ? "is-stale" : undefined}>数据更新：{formatUpdated(stats?.generated_at)}{stale && " · 更新延迟"}</p></div>
        <div className="home-kpi-grid">
          <KpiCard icon="rocket" label="发射总数" value={statValue(stats?.total_launches)} />
          <KpiCard icon="check" label="成功发射" value={statValue(stats?.successful_launches)} />
          <KpiCard icon="target" label="成功率" value={statValue(stats?.success_rate, "%")} />
          <KpiCard icon="users" label="活跃机构" value={statValue(stats?.active_providers)} />
          <KpiCard icon="globe" label="覆盖国家" value={statValue(stats?.active_countries)} />
          <KpiCard icon="pad" label="活跃发射场" value={statValue(stats?.active_pads)} />
        </div>
      </section>

      <section className="home-statistics" aria-labelledby="home-statistics-title">
        <div className="home-statistics-heading"><div><h2 id="home-statistics-title">发射数据总览</h2><p>从时间、机构、地域与运载工具观察全球发射活动</p></div><div><span><HomeIcon name="calendar" />{formatPeriod(stats)}</span><small>更新于 {formatUpdated(stats?.generated_at)}</small></div></div>
        <div className="home-chart-grid">
          <MonthlyChart values={stats?.monthly ?? []} />
          <ProviderChart stats={stats} />
          <CountryChart stats={stats} />
          <RocketChart stats={stats} />
        </div>
      </section>

      <footer className="home-data-footer">
        <p>数据来源</p>
        <div><span><HomeIcon name="rocket" /><b>Launch Library 2</b><small>全球航天发射数据库</small></span><span><HomeIcon name="globe" /><b>Spaceflight News API</b><small>航天新闻与资讯数据</small></span></div>
        <small>本站对公开数据进行中文化整理；发射时间可能随任务进展调整。</small>
      </footer>
    </main>
  );
}
