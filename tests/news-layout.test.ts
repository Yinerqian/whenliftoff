import { describe, expect, it } from "vitest";
import { appendNewsColumns, distributeNewsColumns, newsCardVariant } from "@/lib/news-layout";
import { encodeNewsCursor, paginateNewsItems } from "@/lib/news-repository";
import { newsUpstreamChanged, staleNewsKeys } from "@/lib/sync-news";
import type { NewsListItem } from "@/lib/news-types";

function item(id: number): NewsListItem {
  const published = new Date(Date.UTC(2026, 6, 17, 12, 0, -id)).toISOString();
  return {
    content_type: id % 3 === 0 ? "report" : id % 2 === 0 ? "blog" : "article",
    external_id: id,
    title: `News ${id}`, title_cn: `新闻 ${id}`, summary: null, summary_cn: null, authors: [],
    original_url: `https://example.com/${id}`, image_url: null, news_site: "Example", published_at: published,
    api_updated_at: published, featured: false, related_launch_ids: [], related_event_ids: [], translated_block_count: 0,
    translation_status: "pending", created_at: published, synced_at: published,
  };
}

describe("editorial news layout", () => {
  it("uses deterministic variants and preserves column assignment when appending", () => {
    const first = Array.from({ length: 9 }, (_, index) => item(index + 1));
    const more = Array.from({ length: 10 }, (_, index) => item(index + 10));
    const initialColumns = distributeNewsColumns(first, 3);
    const appended = appendNewsColumns(initialColumns, more);
    initialColumns.forEach((column, index) => {
      expect(appended[index].slice(0, column.length).map((card) => card.item.external_id)).toEqual(column.map((card) => card.item.external_id));
    });
    expect(newsCardVariant(0)).toBe("portrait");
    expect(newsCardVariant(3)).toBe("highlight");
  });

  it("keeps strict source order in one column", () => {
    const items = Array.from({ length: 12 }, (_, index) => item(index + 1));
    expect(distributeNewsColumns(items, 1)[0].map((card) => card.item.external_id)).toEqual(items.map((value) => value.external_id));
  });

  it("accounts for images added to compact and highlight cards", () => {
    const withoutImages = Array.from({ length: 9 }, (_, index) => item(index + 1));
    const withImages = withoutImages.map((item) => ({ ...item, image_url: `https://example.com/${item.external_id}.jpg` }));

    const textColumns = distributeNewsColumns(withoutImages, 3);
    const imageColumns = distributeNewsColumns(withImages, 3);

    expect(imageColumns.map((column) => column.map((card) => card.index))).not.toEqual(
      textColumns.map((column) => column.map((card) => card.index)),
    );
  });
});

describe("news cursor and retention helpers", () => {
  it("returns fixed pages of ten from an opaque cursor", () => {
    const items = Array.from({ length: 30 }, (_, index) => item(index + 1));
    const first = paginateNewsItems(items, undefined, 10);
    const second = paginateNewsItems(items, first.nextCursor ?? undefined, 10);
    expect(first.items).toHaveLength(10);
    expect(second.items[0].external_id).toBe(11);
    expect(first.nextCursor).toBe(encodeNewsCursor(items[9]));
  });

  it("marks only records outside the successful global top thirty as stale", () => {
    const existing = [item(1), item(2), item(3)];
    const active = [item(2), item(3), item(4)];
    expect(staleNewsKeys(existing as never[], active as never[]).map((value) => value.external_id)).toEqual([1]);
  });

  it("treats equivalent UTC timestamp formats as the same upstream version", () => {
    expect(newsUpstreamChanged(
      { api_updated_at: "2026-07-16T20:00:00+00:00" } as never,
      { api_updated_at: "2026-07-16T20:00:00.000Z" } as never,
    )).toBe(false);
    expect(newsUpstreamChanged(
      { api_updated_at: "2026-07-16T20:00:00+00:00" } as never,
      { api_updated_at: "2026-07-16T20:00:01.000Z" } as never,
    )).toBe(true);
  });
});
