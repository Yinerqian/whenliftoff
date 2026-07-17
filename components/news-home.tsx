"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { BackToTop } from "@/components/back-to-top";
import { NewsImage } from "@/components/news-image";
import { UpcomingLaunchCard } from "@/components/upcoming-launch-card";
import { distributeNewsColumns, type NewsColumnCard } from "@/lib/news-layout";
import type { NewsContentType, NewsListItem, NewsPageResult } from "@/lib/news-types";
import type { Launch } from "@/lib/types";

const TYPE_LABEL: Record<NewsContentType, string> = { article: "新闻", blog: "博客", report: "报告" };

function formatNewsDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric",
  }).format(new Date(value));
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type NavigationPoint = { x: number; y: number };
type NavigationFeedbackProps = {
  href: string;
  navigationPoint: NavigationPoint | null;
  onNavigate: (event: PointerEvent<HTMLAnchorElement>, href: string) => void;
  onCommit: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
  onCancel: (href: string) => void;
};

function NavigationFeedback({ point }: { point: NavigationPoint }) {
  return (
    <span className="news-navigation-feedback" role="status">
      <span className="news-navigation-feedback-pill" style={{ left: point.x, top: point.y }}>
        <span className="news-navigation-spinner" aria-hidden="true" />
        正在打开新闻
      </span>
    </span>
  );
}

function NewsCard({ card, navigationPoint, onNavigate, onCommit, onCancel }: { card: NewsColumnCard } & Omit<NavigationFeedbackProps, "href">) {
  const { item, variant } = card;
  const hasSourceImage = Boolean(item.image_url?.trim());
  const showImage = hasSourceImage || (variant !== "highlight" && variant !== "compact");
  const showSummary = variant === "portrait" || variant === "square" || variant === "highlight";
  const href = `/news/${item.content_type}/${item.external_id}`;
  const isNavigating = navigationPoint !== null;
  return (
    <article
      className={`news-card news-card-${variant}${hasSourceImage ? " news-card-has-image" : ""}${isNavigating ? " is-navigating" : ""}`}
      style={{ "--news-enter-delay": `${Math.min(card.index % 9, 6) * 35}ms` } as CSSProperties}
      aria-busy={isNavigating}
    >
      <Link
        href={href}
        aria-label={item.title_cn || item.title}
        onPointerDown={(event) => onNavigate(event, href)}
        onClick={(event) => onCommit(event, href)}
        onPointerCancel={() => onCancel(href)}
        onPointerLeave={(event) => { if (event.buttons !== 0) onCancel(href); }}
      >
        {showImage && <div className="news-card-image"><NewsImage src={item.image_url} alt="" loading="lazy" /></div>}
        <div className="news-card-copy">
          <div className="news-card-kicker"><span>{TYPE_LABEL[item.content_type]}</span><i>·</i><time>{formatNewsDate(item.published_at)}</time></div>
          <h2>{item.title_cn || item.title}</h2>
          <p className="news-card-source">来源：{item.news_site}</p>
          {showSummary && (item.summary_cn || item.summary) && <p className="news-card-summary">{item.summary_cn || item.summary}</p>}
        </div>
        {navigationPoint && <NavigationFeedback point={navigationPoint} />}
      </Link>
    </article>
  );
}

function Feature({ item, navigationPoint, onNavigate, onCommit, onCancel }: { item: NewsListItem } & Omit<NavigationFeedbackProps, "href">) {
  const href = `/news/${item.content_type}/${item.external_id}`;
  const isNavigating = navigationPoint !== null;
  return (
    <article className={`news-feature${isNavigating ? " is-navigating" : ""}`} aria-busy={isNavigating}>
      <NewsImage src={item.image_url} alt="" fetchPriority="high" />
      <div className="news-feature-shade" />
      <div className="news-feature-actions">
        <span className="news-feature-pill">最新</span>
        <Link
          className="upcoming-detail-link"
          href={href}
          aria-label={`新闻详情：${item.title_cn || item.title}`}
          onPointerDown={(event) => onNavigate(event, href)}
          onClick={(event) => onCommit(event, href)}
          onPointerCancel={() => onCancel(href)}
          onPointerLeave={(event) => { if (event.buttons !== 0) onCancel(href); }}
        >
          新闻详情 ↗
        </Link>
      </div>
      <div className="news-feature-copy">
        <h2>{item.title_cn || item.title}</h2>
        <p>来源：{item.news_site}<i>·</i>北京时间 {formatNewsDate(item.published_at)}</p>
      </div>
      {navigationPoint && <NavigationFeedback point={navigationPoint} />}
    </article>
  );
}

export function NewsHome({ initial, nextLaunch, initialError = false, preview = false }: { initial: NewsPageResult; nextLaunch: Launch | null; initialError?: boolean; preview?: boolean }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial.items.slice(1));
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [lastSyncedAt, setLastSyncedAt] = useState(initial.lastSyncedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ? "新闻数据暂时不可用，请稍后重试。" : "");
  const [columnCount, setColumnCount] = useState(3);
  const [navigationState, setNavigationState] = useState<({ href: string } & NavigationPoint) | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const navigationResetRef = useRef<number | null>(null);
  const navigationCommitRef = useRef<number | null>(null);

  useEffect(() => {
    const element = columnsRef.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      setColumnCount(width >= 860 ? 3 : width >= 560 ? 2 : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
  }, []);

  const columns = useMemo(() => distributeNewsColumns(cards, columnCount), [cards, columnCount]);

  function beginNavigation(event: PointerEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    document.documentElement.dataset.newsPointerNavigation = "true";
    const surface = event.currentTarget.closest<HTMLElement>(".news-card, .news-feature") ?? event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - bounds.left, 58), Math.max(bounds.width - 58, 58));
    const y = Math.min(Math.max(event.clientY - bounds.top, 28), Math.max(bounds.height - 28, 28));
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    setNavigationState({ href, x, y });
    navigationResetRef.current = window.setTimeout(() => {
      setNavigationState((current) => current?.href === href ? null : current);
      delete document.documentElement.dataset.newsPointerNavigation;
      navigationResetRef.current = null;
    }, 2500);
  }

  function cancelNavigation(href: string) {
    setNavigationState((current) => current?.href === href ? null : current);
    delete document.documentElement.dataset.newsPointerNavigation;
  }

  function commitNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.detail === 0 || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(href);
      navigationCommitRef.current = null;
    }, 110);
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/news?cursor=${encodeURIComponent(cursor)}${preview ? "&preview=1" : ""}`);
      if (!response.ok) throw new Error("新闻加载失败");
      const page = await response.json() as NewsPageResult;
      setCards((current) => [...current, ...page.items].slice(0, 29));
      setCursor(page.nextCursor);
      setLastSyncedAt((current) => page.lastSyncedAt || current);
    } catch {
      setError("更多新闻加载失败，请稍后重试。 ");
    } finally {
      setLoading(false);
    }
  }

  const feature = initial.items[0];
  return (
    <main className="news-route-main">
      <div className="news-page">
        <header className="news-page-heading"><h1>航天新闻</h1><p>探索太空，发现未来</p></header>
        {feature ? <>
          <section className="news-lead-grid">
            <Feature item={feature} navigationPoint={navigationState?.href === `/news/${feature.content_type}/${feature.external_id}` ? navigationState : null} onNavigate={beginNavigation} onCommit={commitNavigation} onCancel={cancelNavigation} />
            <UpcomingLaunchCard launch={nextLaunch} sourceHref="/news" />
          </section>
          <section className="news-editorial" ref={columnsRef} aria-label="最新航天新闻" aria-busy={loading}>
            {columns.map((column, index) => <div className="news-editorial-column" key={`${columnCount}-${index}`}>{column.map((card) => {
              const href = `/news/${card.item.content_type}/${card.item.external_id}`;
              return <NewsCard card={card} navigationPoint={navigationState?.href === href ? navigationState : null} onNavigate={beginNavigation} onCommit={commitNavigation} onCancel={cancelNavigation} key={`${card.item.content_type}:${card.item.external_id}`} />;
            })}</div>)}
          </section>
          <div className="news-list-footer">
            {error && <p className="news-inline-error" role="status">{error}</p>}
            {cursor && cards.length < 29 && (
              <button className="load-more" type="button" onClick={() => void loadMore()} disabled={loading}>
                {loading && <span className="load-more-spinner" aria-hidden="true" />}
                {loading ? "正在加载…" : "加载更多新闻"}
              </button>
            )}
            <p className="sync-note">
              数据来自 Spaceflight News API
              {lastSyncedAt && <> · 最近同步于 {formatSyncTime(lastSyncedAt)}</>}
            </p>
          </div>
        </> : <section className="news-empty-state"><h2>{initialError ? "新闻暂时不可用" : "正在等待第一批航天新闻"}</h2><p>{error || "同步完成后，最新的新闻、博客和报告会出现在这里。"}</p></section>}
      </div>
      <BackToTop />
    </main>
  );
}
