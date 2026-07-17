"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BackToTop } from "@/components/back-to-top";
import { NewsImage } from "@/components/news-image";
import { NewsLaunchCard } from "@/components/news-launch-card";
import type { NewsContentBlock, NewsContentType, NewsItem } from "@/lib/news-types";
import type { Launch } from "@/lib/types";

const TYPE_LABEL: Record<NewsContentType, string> = { article: "新闻", blog: "博客", report: "报告" };

function formatDetailTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function ArticleBlocks({ blocks }: { blocks: NewsContentBlock[] }) {
  const content: ReactNode[] = [];
  let list: NewsContentBlock[] = [];
  const flushList = () => {
    if (!list.length) return;
    content.push(<ul key={`list-${list[0].id}`}>{list.map((block) => <li key={block.id}>{block.text}</li>)}</ul>);
    list = [];
  };
  blocks.forEach((block) => {
    if (block.type === "list_item") { list.push(block); return; }
    flushList();
    if (block.type === "heading") content.push(<h2 key={block.id}>{block.text}</h2>);
    else if (block.type === "quote") content.push(<blockquote key={block.id}>{block.text}</blockquote>);
    else content.push(<p key={block.id}>{block.text}</p>);
  });
  flushList();
  return content;
}

function ShareCard() {
  const [message, setMessage] = useState("");
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage("链接已复制");
    window.setTimeout(() => setMessage(""), 1800);
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url: window.location.href }); return; } catch { return; }
    }
    await copyLink();
  }
  return (
    <aside className="news-share-card">
      <h2>分享文章</h2>
      <div><button type="button" onClick={share} aria-label="系统分享">↗</button><button type="button" onClick={copyLink} aria-label="复制本站链接">🔗</button></div>
      <p role="status">{message || "分享本站中文阅读页"}</p>
    </aside>
  );
}

export function NewsDetail({ item, launch, hasRelatedLaunch }: { item: NewsItem; launch: Launch | null; hasRelatedLaunch: boolean }) {
  const blocks = item.body_cn_blocks ?? [];
  const hasBody = blocks.length > 0;
  const isPending = item.translation_status === "pending" || item.translation_status === "extracting" || item.translation_status === "translating" || item.translation_status === "failed";
  const authors = (item.authors ?? []).map((author) => author.name).filter(Boolean).join("、");
  return (
    <main className="news-detail-route-main">
      <div className="news-detail-page">
        <nav className="news-breadcrumb" aria-label="面包屑"><Link href="/">首页</Link><span>›</span><Link href="/news">航天新闻</Link><span>›</span><span>{item.title_cn || item.title}</span></nav>
        <header className="news-detail-header">
          <span className="news-detail-type">{TYPE_LABEL[item.content_type]}</span>
          <h1>{item.title_cn || item.title}</h1>
          {item.title_cn && item.title_cn !== item.title && <p className="news-original-title">原题：{item.title}</p>}
          <div className="news-detail-byline"><strong>{item.news_site}</strong><span>{authors || "来源编辑部"}</span><time>北京时间 {formatDetailTime(item.published_at)}</time></div>
        </header>
        <div className="news-detail-layout">
          <article className="news-article">
            <NewsImage className="news-detail-hero" src={item.image_url} alt="" fetchPriority="high" />
            <div className="news-translation-notice">
              <span>AI 中文翻译 · 版权归原文来源</span>
              <a href={item.original_url} target="_blank" rel="noopener noreferrer">阅读原文 ↗</a>
            </div>
            <div className="news-article-body">
              {hasBody ? <ArticleBlocks blocks={blocks} /> : <>
                {(item.summary_cn || item.summary) && <p className="news-summary-lead">{item.summary_cn || item.summary}</p>}
                <div className="news-summary-fallback"><h2>{isPending ? "全文中文化处理中" : "当前仅提供中文摘要"}</h2><p>{isPending ? "正文正在安全抽取并分块翻译，已完成的内容会在后续同步中自动补齐。" : "原网站未能提供可稳定提取的正文，请前往原文继续阅读。"}</p></div>
              </>}
              {hasBody && item.translation_status !== "complete" && <div className="news-summary-fallback"><h2>翻译仍在继续</h2><p>以上为当前已完成的中文正文，后续段落会在同步任务中自动补齐。</p></div>}
            </div>
            <footer className="news-article-footer"><p>本文为 AI 辅助翻译，内容与版权归原文作者及发布机构所有。</p><a className="news-primary-button" href={item.original_url} target="_blank" rel="noopener noreferrer">阅读原文 ↗</a></footer>
          </article>
          <div className="news-detail-sidebar">
            <NewsLaunchCard launch={launch} compact title={hasRelatedLaunch ? "关联发射任务" : "下一次发射"} />
            <ShareCard />
          </div>
        </div>
      </div>
      <BackToTop />
    </main>
  );
}
