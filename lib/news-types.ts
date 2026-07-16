export const NEWS_CONTENT_TYPES = ["article", "blog", "report"] as const;

export type NewsContentType = (typeof NEWS_CONTENT_TYPES)[number];
export type NewsBlockType = "heading" | "paragraph" | "list_item" | "quote";
export type NewsTranslationStatus =
  | "pending"
  | "extracting"
  | "translating"
  | "complete"
  | "summary_only"
  | "failed";

export type NewsAuthor = { name: string; socials?: Record<string, string> | null };

export type NewsContentBlock = {
  id: string;
  type: NewsBlockType;
  text: string;
};

export type NewsItem = {
  content_type: NewsContentType;
  external_id: number;
  title: string;
  title_cn: string | null;
  summary: string | null;
  summary_cn: string | null;
  authors: NewsAuthor[];
  original_url: string;
  image_url: string | null;
  news_site: string;
  published_at: string;
  api_updated_at: string;
  featured: boolean;
  related_launch_ids: string[];
  related_event_ids: number[];
  source_blocks: NewsContentBlock[];
  body_cn_blocks: NewsContentBlock[];
  metadata_hash: string | null;
  content_hash: string | null;
  translated_block_count: number;
  translation_status: NewsTranslationStatus;
  processing_error: string | null;
  last_attempted_at: string | null;
  created_at: string;
  synced_at: string;
};

export type NewsListItem = Omit<
  NewsItem,
  "source_blocks" | "body_cn_blocks" | "metadata_hash" | "content_hash" | "processing_error" | "last_attempted_at"
>;

export type NewsPageResult = {
  items: NewsListItem[];
  nextCursor: string | null;
  lastSyncedAt: string | null;
};

export function isNewsContentType(value: string): value is NewsContentType {
  return NEWS_CONTENT_TYPES.includes(value as NewsContentType);
}

export function newsItemKey(item: Pick<NewsItem, "content_type" | "external_id">) {
  return `${item.content_type}:${item.external_id}`;
}
