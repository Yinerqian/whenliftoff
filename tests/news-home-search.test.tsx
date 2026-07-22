// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsHome } from "@/components/news-home";
import { NEWS_SEARCH_EVENT } from "@/lib/site-search";
import type { NewsListItem, NewsPageResult } from "@/lib/news-types";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("@/components/news-image", () => ({ NewsImage: () => null }));
vi.mock("@/components/upcoming-launch-card", () => ({ UpcomingLaunchCard: () => null }));
vi.mock("@/components/back-to-top", () => ({ BackToTop: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function item(id: number, title: string): NewsListItem {
  const timestamp = new Date(Date.UTC(2026, 6, 19, 12, 0, -id)).toISOString();
  return {
    content_type: "article",
    external_id: id,
    title,
    title_cn: title,
    summary: null,
    summary_cn: `${title}摘要`,
    authors: [],
    original_url: "https://example.com/story",
    image_url: null,
    news_site: "Test News",
    published_at: timestamp,
    api_updated_at: timestamp,
    featured: false,
    related_launch_ids: [],
    related_event_ids: [],
    translated_block_count: 1,
    translation_status: "complete",
    metadata_translation_status: "complete",
    created_at: timestamp,
    synced_at: timestamp,
  };
}

function page(items: NewsListItem[], nextCursor: string | null = null): NewsPageResult {
  return { items, nextCursor, lastSyncedAt: "2026-07-19T12:00:00.000Z" };
}

describe("NewsHome header search", () => {
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    routerPush.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    window.history.replaceState(null, "", "/news");
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<NewsHome initial={page([item(1, "默认新闻")])} nextLaunch={null} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("replaces results, keeps the query for pagination, and renders an empty result", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(page([item(2, "月球搜索结果")], "next")));
    await act(async () => {
      window.dispatchEvent(new CustomEvent(NEWS_SEARCH_EVENT, { detail: "月球" }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(document.body.textContent).toContain("月球搜索结果");
    expect(document.body.textContent).not.toContain("默认新闻");
    expect(window.location.pathname + window.location.search).toBe("/news?q=%E6%9C%88%E7%90%83");
    const searchUrl = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(searchUrl.searchParams.get("q")).toBe("月球");

    fetchMock.mockResolvedValueOnce(Response.json(page([item(3, "后续结果")])));
    const loadMore = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("加载更多新闻"));
    expect(loadMore).toBeTruthy();
    await act(async () => {
      loadMore?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    const nextUrl = new URL(String(fetchMock.mock.calls[1][0]), "http://localhost");
    expect(nextUrl.searchParams.get("cursor")).toBe("next");
    expect(nextUrl.searchParams.get("q")).toBe("月球");
    expect(document.body.textContent).toContain("后续结果");

    fetchMock.mockResolvedValueOnce(Response.json(page([])));
    await act(async () => {
      window.dispatchEvent(new CustomEvent(NEWS_SEARCH_EVENT, { detail: "不存在" }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(document.body.textContent).toContain("未找到相关新闻");
    expect(document.body.textContent).toContain("不存在");
  });

  it("restores the default feed when the query is cleared", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(page([item(4, "恢复后的新闻")])));
    await act(async () => {
      window.dispatchEvent(new CustomEvent(NEWS_SEARCH_EVENT, { detail: "" }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/news");
    expect(window.location.pathname + window.location.search).toBe("/news");
    expect(document.body.textContent).toContain("恢复后的新闻");
  });
});
