import { extractArticle } from "@/lib/news-extraction";
import { contentBlocksHash, chunkNewsBlocks, translateNewsBlocks, translateNewsMetadataBatch } from "@/lib/news-translation";
import { newsItemKey, type NewsItem } from "@/lib/news-types";
import { fetchLatestNews, type NormalizedNewsItem } from "@/lib/spaceflight-news";
import { getSupabaseAdmin } from "@/lib/supabase";

const SYNC_SOURCE = "spaceflight-news-api";
const BODY_BUDGET_MS = 48_000;
const MAX_BODY_ITEMS_PER_RUN = 2;

export function staleNewsKeys(existing: Array<Pick<NewsItem, "content_type" | "external_id">>, active: Array<Pick<NewsItem, "content_type" | "external_id">>) {
  const activeKeys = new Set(active.map(newsItemKey));
  return existing.filter((item) => !activeKeys.has(newsItemKey(item)));
}

export function newsUpstreamChanged(stored: Pick<NewsItem, "api_updated_at"> | null | undefined, latest: Pick<NormalizedNewsItem, "api_updated_at">) {
  if (!stored) return true;
  return Date.parse(stored.api_updated_at) !== Date.parse(latest.api_updated_at);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1_000) : "Unknown news sync error";
}

async function processBody(item: NewsItem, deadline: number) {
  const supabase = getSupabaseAdmin();
  let sourceBlocks = item.source_blocks ?? [];
  let translatedBlocks = item.body_cn_blocks ?? [];
  let translatedCount = item.translated_block_count ?? translatedBlocks.length;

  if (!sourceBlocks.length) {
    await supabase.from("news_items").update({
      translation_status: "extracting", processing_error: null, last_attempted_at: new Date().toISOString(),
    }).eq("content_type", item.content_type).eq("external_id", item.external_id);
    try {
      sourceBlocks = await extractArticle(item.original_url);
      translatedBlocks = [];
      translatedCount = 0;
      const { error } = await supabase.from("news_items").update({
        source_blocks: sourceBlocks,
        body_cn_blocks: [],
        content_hash: contentBlocksHash(sourceBlocks),
        translated_block_count: 0,
        translation_status: "translating",
        processing_error: null,
      }).eq("content_type", item.content_type).eq("external_id", item.external_id);
      if (error) throw error;
    } catch (error) {
      await supabase.from("news_items").update({
        translation_status: "summary_only", processing_error: errorMessage(error), last_attempted_at: new Date().toISOString(),
      }).eq("content_type", item.content_type).eq("external_id", item.external_id);
      return { blocksTranslated: 0, completed: false };
    }
  }

  const remaining = sourceBlocks.slice(translatedCount);
  let blocksTranslated = 0;
  try {
    for (const chunk of chunkNewsBlocks(remaining)) {
      if (Date.now() >= deadline) break;
      const translated = await translateNewsBlocks(chunk);
      translatedBlocks = [...translatedBlocks, ...translated];
      translatedCount += translated.length;
      blocksTranslated += translated.length;
      const complete = translatedCount >= sourceBlocks.length;
      const { error } = await supabase.from("news_items").update({
        body_cn_blocks: translatedBlocks,
        translated_block_count: translatedCount,
        translation_status: complete ? "complete" : "translating",
        processing_error: null,
        last_attempted_at: new Date().toISOString(),
      }).eq("content_type", item.content_type).eq("external_id", item.external_id);
      if (error) throw error;
    }
    return { blocksTranslated, completed: translatedCount >= sourceBlocks.length };
  } catch (error) {
    await supabase.from("news_items").update({
      translation_status: "failed", processing_error: errorMessage(error), last_attempted_at: new Date().toISOString(),
    }).eq("content_type", item.content_type).eq("external_id", item.external_id);
    return { blocksTranslated, completed: false };
  }
}

export async function syncNews() {
  const supabase = getSupabaseAdmin();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ source: SYNC_SOURCE, status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    // All three upstream endpoints must succeed before any rows are changed.
    const latest = await fetchLatestNews();
    const { data: existingRows, error: existingError } = await supabase.from("news_items").select("*").limit(100);
    if (existingError) throw existingError;
    const existing = (existingRows ?? []) as NewsItem[];
    const byKey = new Map(existing.map((item) => [newsItemKey(item), item]));

    const metadataCandidates = latest.filter((item) => {
      const stored = byKey.get(newsItemKey(item));
      return stored?.metadata_hash !== item.metadata_hash || !stored.title_cn || Boolean(item.summary && !stored.summary_cn);
    });
    const translations = new Map<string, { title_cn: string; summary_cn: string | null }>();
    for (let index = 0; index < metadataCandidates.length; index += 15) {
      try {
        const batch = metadataCandidates.slice(index, index + 15);
        const translated = await translateNewsMetadataBatch(batch.map((item) => ({
          key: newsItemKey(item), title: item.title, summary: item.summary,
        })));
        translated.forEach((value, key) => translations.set(key, value));
      } catch {
        // Raw metadata is still persisted and this batch remains pending for the next run.
      }
    }

    for (const item of latest) {
      const key = newsItemKey(item);
      const stored = byKey.get(key);
      const upstreamChanged = newsUpstreamChanged(stored, item);
      const metadata = translations.get(key);
      const reset = upstreamChanged ? {
        source_blocks: [], body_cn_blocks: [], content_hash: null, translated_block_count: 0,
        translation_status: "pending", processing_error: null,
      } : {};
      const row: NormalizedNewsItem & Record<string, unknown> = {
        ...item,
        title_cn: metadata?.title_cn ?? (stored?.metadata_hash === item.metadata_hash ? stored.title_cn : null),
        summary_cn: metadata?.summary_cn ?? (stored?.metadata_hash === item.metadata_hash ? stored.summary_cn : null),
        ...reset,
      };
      const { error } = await supabase.from("news_items").upsert(row, { onConflict: "content_type,external_id" });
      if (error) throw error;
    }

    // Stale rows are removed only after all three endpoint fetches and all active-row upserts succeeded.
    for (const stale of staleNewsKeys(existing, latest as unknown as NewsItem[])) {
      const { error } = await supabase.from("news_items").delete()
        .eq("content_type", stale.content_type).eq("external_id", stale.external_id);
      if (error) throw error;
    }

    const { data: processRows, error: processError } = await supabase.from("news_items").select("*")
      .in("translation_status", ["pending", "translating", "failed"])
      .order("published_at", { ascending: false })
      .limit(MAX_BODY_ITEMS_PER_RUN);
    if (processError) throw processError;
    let blocksTranslated = 0;
    for (const item of (processRows ?? []) as NewsItem[]) {
      if (Date.now() - startedMs >= BODY_BUDGET_MS) break;
      const result = await processBody(item, startedMs + BODY_BUDGET_MS);
      blocksTranslated += result.blocksTranslated;
    }

    const completedAt = new Date().toISOString();
    await supabase.from("sync_runs").update({
      status: "success",
      completed_at: completedAt,
      records_processed: latest.length,
      translations_processed: translations.size + blocksTranslated,
    }).eq("id", run.id);
    return { recordsProcessed: latest.length, metadataTranslated: translations.size, blocksTranslated, completedAt };
  } catch (error) {
    await supabase.from("sync_runs").update({
      status: "failed", completed_at: new Date().toISOString(), error_message: errorMessage(error),
    }).eq("id", run.id);
    throw error;
  }
}
