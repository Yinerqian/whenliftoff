import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isNewsContentType, newsItemKey, type NewsItem, type NewsListItem, type NewsPageResult } from "@/lib/news-types";

const LIST_COLUMNS = [
  "content_type", "external_id", "title", "title_cn", "summary", "summary_cn", "authors", "original_url",
  "image_url", "news_site", "published_at", "api_updated_at", "featured", "related_launch_ids", "related_event_ids",
  "translated_block_count", "translation_status", "created_at", "synced_at",
].join(",");

type CursorValue = { published_at: string; content_type: string; external_id: number };

export function encodeNewsCursor(item: Pick<NewsListItem, "published_at" | "content_type" | "external_id">) {
  return Buffer.from(JSON.stringify({
    published_at: item.published_at,
    content_type: item.content_type,
    external_id: item.external_id,
  })).toString("base64url");
}

export function decodeNewsCursor(cursor?: string): CursorValue | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorValue;
    if (!Number.isSafeInteger(value.external_id) || !isNewsContentType(value.content_type) || !Number.isFinite(Date.parse(value.published_at))) return null;
    return value;
  } catch {
    return null;
  }
}

export function paginateNewsItems(items: NewsListItem[], cursor?: string, limit = 10, lastSyncedAt: string | null = null): NewsPageResult {
  const decoded = decodeNewsCursor(cursor);
  const start = decoded ? Math.max(0, items.findIndex((item) => newsItemKey(item) === `${decoded.content_type}:${decoded.external_id}`) + 1) : 0;
  const page = items.slice(start, start + limit);
  return {
    items: page,
    nextCursor: start + page.length < items.length && page.length ? encodeNewsCursor(page[page.length - 1]) : null,
    lastSyncedAt,
  };
}

export async function listNews(cursor?: string): Promise<NewsPageResult> {
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: latest }] = await Promise.all([
    supabase
      .from("news_items")
      .select(LIST_COLUMNS)
      .order("published_at", { ascending: false })
      .order("content_type", { ascending: true })
      .order("external_id", { ascending: false })
      .limit(30),
    supabase
      .from("sync_runs")
      .select("completed_at")
      .eq("source", "spaceflight-news-api")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw error;
  return paginateNewsItems((data ?? []) as unknown as NewsListItem[], cursor, 10, latest?.completed_at ?? null);
}

async function getNewsItemUncached(contentType: string, externalId: number) {
  if (!isNewsContentType(contentType) || !Number.isSafeInteger(externalId) || externalId < 0) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("news_items")
    .select("*")
    .eq("content_type", contentType)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw error;
  return data as NewsItem | null;
}

export const getNewsItem = cache(getNewsItemUncached);
