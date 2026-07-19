"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { NewsImage } from "@/components/news-image";
import type { NewsListItem } from "@/lib/news-types";

function formatNewsDate(value: string) {
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

export function HomeLatestNews({ news }: { news: NewsListItem | null }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationCommitRef = useRef<number | null>(null);
  const navigationResetRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
  }, []);

  if (!news) {
    return <div className="home-news-empty"><p>最新航天动态暂时不可用。</p><Link href="/news">进入新闻中心 →</Link></div>;
  }

  const href = `/news/${news.content_type}/${news.external_id}`;
  const title = news.title_cn || news.title;
  const summary = news.summary_cn || news.summary || "点击查看这条航天动态的中文摘要与来源信息。";
  const typeLabel = news.content_type === "blog" ? "机构博客" : news.content_type === "report" ? "行业报告" : "航天新闻";

  function commitNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (event.detail === 0 || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setIsNavigating(true);
    if (navigationCommitRef.current !== null) window.clearTimeout(navigationCommitRef.current);
    if (navigationResetRef.current !== null) window.clearTimeout(navigationResetRef.current);
    navigationCommitRef.current = window.setTimeout(() => {
      router.push(href);
      navigationCommitRef.current = null;
    }, 110);
    navigationResetRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      navigationResetRef.current = null;
    }, 2500);
  }

  return (
    <article className={`home-news-feature${isNavigating ? " is-navigating" : ""}`} aria-busy={isNavigating}>
      <Link className="home-news-image" href={href} aria-label={title}>
        <NewsImage src={news.image_url} alt="" />
        {isNavigating && (
          <span className="news-navigation-feedback home-news-navigation-feedback" role="status">
            <span className="news-navigation-feedback-pill">
              <span className="news-navigation-spinner" aria-hidden="true" />
              正在加载详情
            </span>
          </span>
        )}
      </Link>
      <div className="home-news-copy">
        <p className="home-news-meta"><span>{typeLabel}</span><i>·</i>{news.news_site}<i>·</i>{formatNewsDate(news.published_at)}</p>
        <h3><Link href={href}>{title}</Link></h3>
        <p className="home-news-summary">{summary}</p>
        <div className="home-news-tags"><span>{typeLabel}</span><span>{news.news_site}</span>{news.featured && <span>编辑推荐</span>}</div>
        <Link
          className="home-news-button"
          href={href}
          onClick={commitNavigation}
        >
          阅读全文 <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
