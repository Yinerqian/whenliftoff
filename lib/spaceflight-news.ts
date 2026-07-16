import { createHash } from "node:crypto";
import type { NewsAuthor, NewsContentType, NewsItem } from "@/lib/news-types";

const API_BASE = "https://api.spaceflightnewsapi.net/v4";
const TYPE_ORDER: Record<NewsContentType, number> = { article: 0, blog: 1, report: 2 };

type UpstreamRelation = { launch_id?: string | null; event_id?: number | null };
type UpstreamNewsItem = {
  id: number;
  title: string;
  authors?: NewsAuthor[] | null;
  url: string;
  image_url?: string | null;
  news_site: string;
  summary?: string | null;
  published_at: string;
  updated_at: string;
  featured?: boolean;
  launches?: UpstreamRelation[] | null;
  events?: UpstreamRelation[] | null;
};
type UpstreamResponse = { results?: UpstreamNewsItem[] };

export type NormalizedNewsItem = Omit<
  NewsItem,
  "created_at" | "source_blocks" | "body_cn_blocks" | "translation_status" | "translated_block_count" |
    "processing_error" | "last_attempted_at" | "content_hash" | "title_cn" | "summary_cn"
> & { metadata_hash: string };

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanUrl(value: unknown) {
  const text = cleanText(value);
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeNewsItem(contentType: NewsContentType, source: UpstreamNewsItem): NormalizedNewsItem {
  const title = cleanText(source.title);
  const originalUrl = cleanUrl(source.url);
  if (!Number.isSafeInteger(source.id) || source.id < 0 || !title || !originalUrl) {
    throw new Error(`Invalid ${contentType} payload from Spaceflight News API.`);
  }
  const authors = (source.authors ?? [])
    .map((author) => ({ name: cleanText(author.name), socials: author.socials ?? null }))
    .filter((author) => author.name);
  const value = {
    content_type: contentType,
    external_id: source.id,
    title,
    summary: cleanText(source.summary) || null,
    authors,
    original_url: originalUrl,
    image_url: cleanUrl(source.image_url),
    news_site: cleanText(source.news_site) || "未知来源",
    published_at: new Date(source.published_at).toISOString(),
    api_updated_at: new Date(source.updated_at || source.published_at).toISOString(),
    featured: Boolean(source.featured),
    related_launch_ids: [...new Set((source.launches ?? []).map((item) => item.launch_id).filter((id): id is string => Boolean(id)))],
    related_event_ids: [...new Set((source.events ?? []).map((item) => item.event_id).filter((id): id is number => Number.isSafeInteger(id)))],
    synced_at: new Date().toISOString(),
  };
  return {
    ...value,
    metadata_hash: createHash("sha256").update(JSON.stringify({ title: value.title, summary: value.summary })).digest("hex"),
  };
}

export function compareNewsNewestFirst(a: Pick<NormalizedNewsItem, "published_at" | "content_type" | "external_id">, b: Pick<NormalizedNewsItem, "published_at" | "content_type" | "external_id">) {
  const time = Date.parse(b.published_at) - Date.parse(a.published_at);
  if (time) return time;
  const type = TYPE_ORDER[a.content_type] - TYPE_ORDER[b.content_type];
  return type || b.external_id - a.external_id;
}

export function mergeLatestNews(groups: NormalizedNewsItem[][], limit = 30) {
  return groups.flat().sort(compareNewsNewestFirst).slice(0, limit);
}

async function fetchType(contentType: NewsContentType, signal?: AbortSignal) {
  const endpoint = contentType === "article" ? "articles" : `${contentType}s`;
  const response = await fetch(`${API_BASE}/${endpoint}/?limit=30&ordering=-published_at`, {
    signal,
    headers: { Accept: "application/json", "User-Agent": "whenliftoff/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Spaceflight News ${endpoint} failed (${response.status}).`);
  const payload = await response.json() as UpstreamResponse;
  if (!Array.isArray(payload.results)) throw new Error(`Spaceflight News ${endpoint} returned invalid data.`);
  return payload.results.map((item) => normalizeNewsItem(contentType, item));
}

export async function fetchLatestNews() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const groups = await Promise.all([
      fetchType("article", controller.signal),
      fetchType("blog", controller.signal),
      fetchType("report", controller.signal),
    ]);
    return mergeLatestNews(groups, 30);
  } finally {
    clearTimeout(timeout);
  }
}

