import { contentBlocksHash, chunkNewsBlocks, translateNewsBlocks, translateNewsMetadataBatch, type NewsMetadataTranslation } from "@/lib/news-translation";
import { newsItemKey, type NewsItem, type NewsMetadataTranslationStatus } from "@/lib/news-types";
import { fetchLatestNews, type NormalizedNewsItem } from "@/lib/spaceflight-news";
import { getSupabaseAdmin } from "@/lib/supabase";

const SYNC_SOURCE = "spaceflight-news-api";
const SYNC_WORK_BUDGET_MS = 275_000;
const METADATA_BUDGET_MS = 220_000;
const TRANSLATION_REQUEST_BUDGET_MS = 30_000;
const METADATA_BATCH_SIZE = 10;
const METADATA_RETRY_BATCH_SIZE = 5;
const MAX_BODY_ITEMS_PER_RUN = 10;

export function staleNewsKeys(
  existing: Array<Pick<NewsItem, "content_type" | "external_id">>,
  active: Array<Pick<NewsItem, "content_type" | "external_id">>,
  additionallyRetained: Array<Pick<NewsItem, "content_type" | "external_id">> = [],
) {
  const activeKeys = new Set([...active, ...additionallyRetained].map(newsItemKey));
  return existing.filter((item) => !activeKeys.has(newsItemKey(item)));
}

export function newsUpstreamChanged(stored: Pick<NewsItem, "api_updated_at"> | null | undefined, latest: Pick<NormalizedNewsItem, "api_updated_at">) {
  if (!stored) return true;
  return Date.parse(stored.api_updated_at) !== Date.parse(latest.api_updated_at);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1_000) : "Unknown news sync error";
}

export function isNewsMetadataReady(
  item: Pick<NormalizedNewsItem, "summary">,
  translation: NewsMetadataTranslation,
) {
  return Boolean(translation.title_cn.trim()) && (item.summary === null || Boolean(translation.summary_cn?.trim()));
}

function chunksOf<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function hasTranslationTime(deadline: number) {
  return Date.now() + TRANSLATION_REQUEST_BUDGET_MS < deadline;
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
      // Keep the HTML parser out of the route's startup bundle. If an article parser
      // dependency ever fails to load, metadata synchronization can still complete
      // and this item gracefully falls back to its translated summary.
      const { extractArticle } = await import("@/lib/news-extraction");
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
      if (!hasTranslationTime(deadline)) break;
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
  const metadataDeadline = startedMs + METADATA_BUDGET_MS;
  const workDeadline = startedMs + SYNC_WORK_BUDGET_MS;
  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ source: SYNC_SOURCE, status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    // All three upstream endpoints must succeed before any rows are changed.
    const latest = await fetchLatestNews();
    const { data: existingRows, error: existingError } = await supabase.from("news_items").select("*").limit(200);
    if (existingError) throw existingError;
    const existing = (existingRows ?? []) as NewsItem[];
    const byKey = new Map(existing.map((item) => [newsItemKey(item), item]));
    const metadataStatuses = new Map<string, NewsMetadataTranslationStatus>();

    // Persist upstream data first, but keep new or changed metadata hidden until its
    // Chinese title and (when present) summary have both been validated.
    for (const item of latest) {
      const key = newsItemKey(item);
      const stored = byKey.get(key);
      const upstreamChanged = newsUpstreamChanged(stored, item);
      const sameMetadata = stored?.metadata_hash === item.metadata_hash;
      const storedReady = Boolean(
        sameMetadata &&
        stored?.metadata_translation_status === "complete" &&
        stored.title_cn?.trim() &&
        (item.summary === null || stored.summary_cn?.trim()),
      );
      const metadataStatus: NewsMetadataTranslationStatus = storedReady
        ? "complete"
        : sameMetadata && stored?.metadata_translation_status === "failed"
          ? "failed"
          : "pending";
      metadataStatuses.set(key, metadataStatus);
      const reset = upstreamChanged ? {
        source_blocks: [], body_cn_blocks: [], content_hash: null, translated_block_count: 0,
        translation_status: "pending", processing_error: null,
      } : {};
      const row: NormalizedNewsItem & Record<string, unknown> = {
        ...item,
        title_cn: sameMetadata ? stored?.title_cn ?? null : null,
        summary_cn: sameMetadata ? stored?.summary_cn ?? null : null,
        metadata_translation_status: metadataStatus,
        metadata_translation_error: sameMetadata ? stored?.metadata_translation_error ?? null : null,
        metadata_translation_attempted_at: sameMetadata ? stored?.metadata_translation_attempted_at ?? null : null,
        ...reset,
      };
      const { error } = await supabase.from("news_items").upsert(row, { onConflict: "content_type,external_id" });
      if (error) throw error;
    }

    const metadataCandidates = latest.filter((item) => metadataStatuses.get(newsItemKey(item)) !== "complete");
    const completedKeys = new Set<string>();
    const attemptCounts = new Map<string, number>();
    const failureMessages = new Map<string, string>();
    let metadataTranslated = 0;
    let metadataRetried = 0;
    let budgetExhausted = false;

    async function updateMetadata(item: NormalizedNewsItem, values: Record<string, unknown>) {
      const { error } = await supabase.from("news_items").update(values)
        .eq("content_type", item.content_type).eq("external_id", item.external_id);
      if (error) throw error;
    }

    async function translateMetadataBatch(batch: NormalizedNewsItem[]) {
      const attemptedAt = new Date().toISOString();
      for (const item of batch) {
        const key = newsItemKey(item);
        attemptCounts.set(key, (attemptCounts.get(key) ?? 0) + 1);
        metadataStatuses.set(key, "translating");
        await updateMetadata(item, {
          metadata_translation_status: "translating",
          metadata_translation_error: null,
          metadata_translation_attempted_at: attemptedAt,
        });
      }

      let translated: Map<string, NewsMetadataTranslation>;
      try {
        translated = await translateNewsMetadataBatch(batch.map((item) => ({
          key: newsItemKey(item), title: item.title, summary: item.summary,
        })));
      } catch (error) {
        const message = errorMessage(error);
        batch.forEach((item) => failureMessages.set(newsItemKey(item), message));
        return batch;
      }

      const failed: NormalizedNewsItem[] = [];
      for (const item of batch) {
        const key = newsItemKey(item);
        const translation = translated.get(key);
        if (!translation || !isNewsMetadataReady(item, translation)) {
          failureMessages.set(key, translation
            ? "DeepSeek returned incomplete Chinese metadata."
            : "DeepSeek omitted this metadata translation.");
          failed.push(item);
          continue;
        }
        await updateMetadata(item, {
          title_cn: translation.title_cn.trim(),
          summary_cn: item.summary === null ? null : translation.summary_cn?.trim() ?? null,
          metadata_translation_status: "complete",
          metadata_translation_error: null,
          metadata_translation_attempted_at: attemptedAt,
        });
        metadataStatuses.set(key, "complete");
        completedKeys.add(key);
        metadataTranslated += 1;
      }
      return failed;
    }

    const retryCandidates: NormalizedNewsItem[] = [];
    for (const batch of chunksOf(metadataCandidates, METADATA_BATCH_SIZE)) {
      if (!hasTranslationTime(metadataDeadline)) {
        budgetExhausted = true;
        break;
      }
      retryCandidates.push(...await translateMetadataBatch(batch));
    }

    const uniqueRetryCandidates = [...new Map(retryCandidates.map((item) => [newsItemKey(item), item])).values()];
    for (const batch of chunksOf(uniqueRetryCandidates, METADATA_RETRY_BATCH_SIZE)) {
      if (!hasTranslationTime(metadataDeadline)) {
        budgetExhausted = true;
        break;
      }
      metadataRetried += batch.length;
      await translateMetadataBatch(batch);
    }

    // Never leave an interrupted request publicly eligible or stuck in a transient state.
    for (const item of metadataCandidates) {
      const key = newsItemKey(item);
      if (completedKeys.has(key)) continue;
      const attempts = attemptCounts.get(key) ?? 0;
      const status: NewsMetadataTranslationStatus = attempts >= 2 ? "failed" : "pending";
      metadataStatuses.set(key, status);
      await updateMetadata(item, {
        metadata_translation_status: status,
        metadata_translation_error: attempts >= 2
          ? failureMessages.get(key) ?? "Metadata translation failed after retry."
          : attempts > 0
            ? failureMessages.get(key) ?? "Metadata translation deferred by the sync deadline."
            : null,
        metadata_translation_attempted_at: attempts > 0 ? new Date().toISOString() : null,
      });
    }

    const { data: processRows, error: processError } = await supabase.from("news_items").select("*")
      .eq("metadata_translation_status", "complete")
      .in("translation_status", ["pending", "translating", "failed"])
      .order("published_at", { ascending: false })
      .limit(MAX_BODY_ITEMS_PER_RUN);
    if (processError) throw processError;
    let blocksTranslated = 0;
    for (const item of (processRows ?? []) as NewsItem[]) {
      if (!hasTranslationTime(workDeadline)) {
        budgetExhausted = true;
        break;
      }
      const result = await processBody(item, workDeadline);
      blocksTranslated += result.blocksTranslated;
    }

    // Keep the current upstream window plus enough already-published Chinese rows
    // to avoid an empty or shrinking public feed while new rows are translating.
    const { data: publicRows, error: publicRowsError } = await supabase.from("news_items")
      .select("content_type,external_id")
      .eq("metadata_translation_status", "complete")
      .order("published_at", { ascending: false })
      .order("content_type", { ascending: true })
      .order("external_id", { ascending: false })
      .limit(30);
    if (publicRowsError) throw publicRowsError;
    for (const stale of staleNewsKeys(existing, latest as unknown as NewsItem[], (publicRows ?? []) as NewsItem[])) {
      const { error } = await supabase.from("news_items").delete()
        .eq("content_type", stale.content_type).eq("external_id", stale.external_id);
      if (error) throw error;
    }

    const metadataReady = [...metadataStatuses.values()].filter((status) => status === "complete").length;
    const metadataFailed = [...metadataStatuses.values()].filter((status) => status === "failed").length;
    const metadataPending = latest.length - metadataReady - metadataFailed;
    budgetExhausted ||= Date.now() >= workDeadline;

    const completedAt = new Date().toISOString();
    const metadata = {
      metadata_ready: metadataReady,
      metadata_pending: metadataPending,
      metadata_failed: metadataFailed,
      metadata_retried: metadataRetried,
      body_blocks_translated: blocksTranslated,
      budget_exhausted: budgetExhausted,
    };
    const { error: completionError } = await supabase.from("sync_runs").update({
      status: "success",
      completed_at: completedAt,
      records_processed: latest.length,
      translations_processed: metadataTranslated + blocksTranslated,
      metadata,
    }).eq("id", run.id);
    if (completionError) throw completionError;
    return {
      recordsProcessed: latest.length,
      metadataTranslated,
      metadataReady,
      metadataPending,
      metadataFailed,
      metadataRetried,
      blocksTranslated,
      budgetExhausted,
      completedAt,
    };
  } catch (error) {
    await supabase.from("sync_runs").update({
      status: "failed", completed_at: new Date().toISOString(), error_message: errorMessage(error),
    }).eq("id", run.id);
    throw error;
  }
}
