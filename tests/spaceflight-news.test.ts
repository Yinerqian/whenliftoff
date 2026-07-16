import { describe, expect, it } from "vitest";
import { newsItemKey } from "@/lib/news-types";
import { mergeLatestNews, normalizeNewsItem } from "@/lib/spaceflight-news";

function upstream(id: number, publishedAt: string) {
  return {
    id,
    title: `Mission update ${id}`,
    authors: [{ name: "Reporter" }],
    url: `https://example.com/${id}`,
    image_url: "https://example.com/image.jpg",
    news_site: "Example Space",
    summary: "A concise mission update.",
    published_at: publishedAt,
    updated_at: publishedAt,
    featured: false,
    launches: [{ launch_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479" }],
    events: [{ event_id: 42 }],
  };
}

describe("Spaceflight News normalization", () => {
  it("keeps overlapping upstream ids distinct by content type", () => {
    const article = normalizeNewsItem("article", upstream(7, "2026-07-16T10:00:00Z"));
    const blog = normalizeNewsItem("blog", upstream(7, "2026-07-16T09:00:00Z"));
    expect(newsItemKey(article)).toBe("article:7");
    expect(newsItemKey(blog)).toBe("blog:7");
    expect(article.related_launch_ids).toEqual(["f47ac10b-58cc-4372-a567-0e02b2c3d479"]);
  });

  it("merges all sources, sorts globally and limits to thirty", () => {
    const groups = (["article", "blog", "report"] as const).map((type, group) =>
      Array.from({ length: 14 }, (_, index) => normalizeNewsItem(type, upstream(group * 100 + index, new Date(Date.UTC(2026, 6, group * 14 + index + 1)).toISOString()))),
    );
    const merged = mergeLatestNews(groups, 30);
    expect(merged).toHaveLength(30);
    expect(Date.parse(merged[0].published_at)).toBeGreaterThanOrEqual(Date.parse(merged[29].published_at));
    expect(new Set(merged.map(newsItemKey)).size).toBe(30);
  });
});

