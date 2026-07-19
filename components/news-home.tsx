"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { BackToTop } from "@/components/back-to-top";
import { NewsImage } from "@/components/news-image";
import { UpcomingLaunchCard } from "@/components/upcoming-launch-card";
import { peekPendingScrollRestore } from "@/lib/detail-return-position";
import { distributeNewsColumns, type NewsColumnCard } from "@/lib/news-layout";
import { NEWS_SEARCH_EVENT } from "@/lib/site-search";
import type { NewsContentType, NewsListItem, NewsPageResult } from "@/lib/news-types";
import type { Launch } from "@/lib/types";

const TYPE_LABEL: Record<NewsContentType, string> = { article: "新闻", blog: "博客", report: "报告" };
const NEWS_LIST_SESSION_KEY = "whenliftoff:news-list-session";
const NEWS_LIST_SESSION_MAX_AGE = 4 * 60 * 60 * 1000;

type NewsListSession = {
  sourcePath: string;
  feature: NewsListItem | null;
  cards: NewsListItem[];
  cursor: string | null;
  lastSyncedAt: string | null;
  savedAt: number;
};

function readNewsListSession(sourcePath: string) {
  try {
    const value = window.sessionStorage.getItem(NEWS_LIST_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as NewsListSession;
    if (session.sourcePath !== sourcePath || Date.now() - session.savedAt > NEWS_LIST_SESSION_MAX_AGE || !Array.isArray(session.cards)) return null;
    return session;
  } catch {
    return null;
  }
}

function writeNewsListSession(session: Omit<NewsListSession, "savedAt">) {
  try {
    window.sessionStorage.setItem(NEWS_LIST_SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() } satisfies NewsListSession));
  } catch {
    // The detail navigation remains usable when session storage is unavailable.
  }
}

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
  onCommit: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
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

function NewsCard({ card, navigationPoint, onCommit }: { card: NewsColumnCard } & Omit<NavigationFeedbackProps, "href">) {
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
        onClick={(event) => onCommit(event, href)}
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

function Feature({ item, navigationPoint, onCommit }: { item: NewsListItem } & Omit<NavigationFeedbackProps, "href">) {
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
          onClick={(event) => onCommit(event, href)}
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

export function NewsHome({ initial, nextLaunch, initialError = false, preview = false, initialSearch = "" }: { initial: NewsPageResult; nextLaunch: Launch | null; initialError?: boolean; preview?: boolean; initialSearch?: string }) {
  const router = useRouter();
  const [feature, setFeature] = useState<NewsListItem | undefined>(initial.items[0]);
  const [cards, setCards] = useState(initial.items.slice(1));
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [lastSyncedAt, setLastSyncedAt] = useState(initial.lastSyncedAt);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ? "新闻数据暂时不可用，请稍后重试。" : "");
  const [columnCount, setColumnCount] = useState(3);
  const [navigationState, setNavigationState] = useState<({ href: string } & NavigationPoint) | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const navigationResetRef = useRef<number | null>(null);
  const navigationCommitRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const sourcePath = `${window.location.pathname}${window.location.search}`;
    if (!peekPendingScrollRestore(sourcePath)) return;
    const session = readNewsListSession(sourcePath);
    if (!session) return;
    setFeature(session.feature ?? undefined);
    setCards(session.cards);
    setCursor(session.cursor);
    setLastSyncedAt(session.lastSyncedAt);
    setError("");
  }, []);

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

  const searchNews = useCallback(async (value: string) => {
    const query = value.trim().slice(0, 100);
    const requestId = ++requestIdRef.current;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (preview) params.set("preview", "1");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/news${params.size ? `?${params.toString()}` : ""}`);
      if (!response.ok) throw new Error("新闻搜索失败");
      const page = await response.json() as NewsPageResult;
      if (requestId !== requestIdRef.current) return;
      setFeature(page.items[0]);
      setCards(page.items.slice(1));
      setCursor(page.nextCursor);
      setLastSyncedAt(page.lastSyncedAt);
      setSearchQuery(query);
      setNavigationState(null);
      window.history.replaceState(null, "", `/news${params.size ? `?${params.toString()}` : ""}`);
    } catch {
      if (requestId === requestIdRef.current) setError(query ? "新闻搜索暂时不可用，请稍后重试。" : "新闻数据暂时不可用，请稍后重试。");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [preview]);

  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      const query = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "";
      void searchNews(query);
    }
    window.addEventListener(NEWS_SEARCH_EVENT, handleHeaderSearch);
    return () => window.removeEventListener(NEWS_SEARCH_EVENT, handleHeaderSearch);
  }, [searchNews]);

  const columns = useMemo(() => distributeNewsColumns(cards, columnCount), [cards, columnCount]);

  function commitNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    writeNewsListSession({
      sourcePath: `${window.location.pathname}${window.location.search}`,
      feature: feature ?? null,
      cards,
      cursor,
      lastSyncedAt,
    });
    if (event.detail === 0) return;
    event.preventDefault();
    document.documentElement.dataset.newsPointerNavigation = "true";
    const surface = event.currentTarget.closest<HTMLElement>(".news-card, .news-feature") ?? event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    setNavigationState({ href, x: bounds.width / 2, y: bounds.height / 2 });
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(href);
      navigationCommitRef.current = null;
    }, 110);
    navigationResetRef.current = window.setTimeout(() => {
      setNavigationState((current) => current?.href === href ? null : current);
      delete document.documentElement.dataset.newsPointerNavigation;
      navigationResetRef.current = null;
    }, 2500);
  }

  async function loadMore() {
    if (!cursor || loading) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ cursor });
      if (searchQuery) params.set("q", searchQuery);
      if (preview) params.set("preview", "1");
      const response = await fetch(`/api/news?${params.toString()}`);
      if (!response.ok) throw new Error("新闻加载失败");
      const page = await response.json() as NewsPageResult;
      if (requestId !== requestIdRef.current) return;
      setCards((current) => [...current, ...page.items].slice(0, 29));
      setCursor(page.nextCursor);
      setLastSyncedAt((current) => page.lastSyncedAt || current);
    } catch {
      if (requestId === requestIdRef.current) setError("更多新闻加载失败，请稍后重试。 ");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  const emptyTitle = error ? "新闻暂时不可用" : searchQuery ? "未找到相关新闻" : "正在等待第一批航天新闻";
  const emptyMessage = error || (searchQuery ? `没有找到与“${searchQuery}”相关的新闻，请尝试其他关键词。` : "同步完成后，最新的新闻、博客和报告会出现在这里。");

  return (
    <main className="news-route-main">
      <div className="news-page" aria-busy={loading}>
        <header className="news-page-heading"><h1>航天新闻</h1><p>探索太空，发现未来</p></header>
        {feature ? <>
          <section className="news-lead-grid">
            <Feature item={feature} navigationPoint={navigationState?.href === `/news/${feature.content_type}/${feature.external_id}` ? navigationState : null} onCommit={commitNavigation} />
            <UpcomingLaunchCard launch={nextLaunch} sourceHref="/news" />
          </section>
          <section className="news-editorial" ref={columnsRef} aria-label="最新航天新闻" aria-busy={loading}>
            {columns.map((column, index) => <div className="news-editorial-column" key={`${columnCount}-${index}`}>{column.map((card) => {
              const href = `/news/${card.item.content_type}/${card.item.external_id}`;
              return <NewsCard card={card} navigationPoint={navigationState?.href === href ? navigationState : null} onCommit={commitNavigation} key={`${card.item.content_type}:${card.item.external_id}`} />;
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
        </> : <section className="news-empty-state"><h2>{emptyTitle}</h2><p>{emptyMessage}</p></section>}
      </div>
      <BackToTop />
    </main>
  );
}
