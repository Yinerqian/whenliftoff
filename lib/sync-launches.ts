import {
  fetchCurrentYearLaunchesForStatistics,
  fetchLaunchesByIdsFresh,
  fetchRecentLaunches,
  fetchUpcomingLaunches,
  selectLatestLaunchSnapshots,
  toLaunchRecord,
} from "@/lib/launch-library";
import { aggregateHomeLaunchStatistics } from "@/lib/launch-statistics";
import { getSupabaseAdmin } from "@/lib/supabase";
import { translateLaunch, translationHash } from "@/lib/translation";
import type { LaunchLibraryLaunch } from "@/lib/types";

export type LaunchSyncMode = "full" | "hot";

const SYNC_SOURCE = "launch-library-2";
const NON_TERMINAL_STATUSES = ["Go", "TBC", "TBD", "Hold", "In Flight"];
const RECENT_REVIEW_DAYS = 30;
const MAX_DETAIL_REVIEWS = 24;
const HOT_SYNC_PAST_HOURS = 48;
const HOT_SYNC_FUTURE_HOURS = 6;
const MAX_HOT_CANDIDATES = 100;
const STALE_RUN_MINUTES = 5;

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type PersistResult = {
  recordsProcessed: number;
  translationsProcessed: number;
  statusChanges: number;
  staleSnapshotsSkipped: number;
};

type ModeResult = PersistResult & {
  candidates: number;
  apiRequests: number;
  metadata: Record<string, unknown>;
};

export type LaunchSyncResult = PersistResult & {
  mode: LaunchSyncMode;
  candidates: number;
  apiRequests: number;
  completedAt: string;
  skipped?: "already_running";
};

export function parseLaunchSyncMode(value: string | null): LaunchSyncMode | null {
  if (value === null) return "full";
  return value === "full" || value === "hot" ? value : null;
}

function launchWindowEnded(launch: { launch_time_utc: string | null; window_end_utc: string | null }, now: Date) {
  const end = Date.parse(launch.window_end_utc ?? launch.launch_time_utc ?? "");
  return Number.isFinite(end) && end <= now.getTime();
}

export function hotSyncBounds(now = new Date()) {
  return {
    from: new Date(now.getTime() - HOT_SYNC_PAST_HOURS * 60 * 60 * 1000).toISOString(),
    to: new Date(now.getTime() + HOT_SYNC_FUTURE_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export function selectHotLaunchCandidates<T extends { launch_time_utc: string | null }>(launches: T[], now = new Date(), limit = MAX_HOT_CANDIDATES) {
  const { from, to } = hotSyncBounds(now);
  const start = Date.parse(from);
  const end = Date.parse(to);
  return launches
    .filter((launch) => {
      const launchTime = Date.parse(launch.launch_time_utc ?? "");
      return Number.isFinite(launchTime) && launchTime >= start && launchTime <= end;
    })
    .sort((left, right) => Date.parse(left.launch_time_utc ?? "") - Date.parse(right.launch_time_utc ?? ""))
    .slice(0, Math.max(0, limit));
}

export function isOlderApiSnapshot(incoming: string | null, existing: string | null | undefined) {
  const incomingTime = Date.parse(incoming ?? "");
  const existingTime = Date.parse(existing ?? "");
  return Number.isFinite(existingTime) && (!Number.isFinite(incomingTime) || incomingTime < existingTime);
}

async function beginSyncRun(supabase: SupabaseAdmin, mode: LaunchSyncMode, startedAt: string) {
  const staleBefore = new Date(Date.parse(startedAt) - STALE_RUN_MINUTES * 60 * 1000).toISOString();
  const { error: staleError } = await supabase
    .from("sync_runs")
    .update({
      status: "failed",
      completed_at: startedAt,
      error_message: "Synchronization lease expired",
      metadata: { skippedReason: "stale_lock_expired" },
    })
    .eq("source", SYNC_SOURCE)
    .eq("status", "running")
    .lt("started_at", staleBefore);
  if (staleError) throw staleError;

  const { data: run, error } = await supabase
    .from("sync_runs")
    .insert({ source: SYNC_SOURCE, status: "running", sync_mode: mode, started_at: startedAt, metadata: {} })
    .select("id")
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return run;
}

async function persistLaunchSnapshots(supabase: SupabaseAdmin, sourceLaunches: LaunchLibraryLaunch[]): Promise<PersistResult> {
  let translationsProcessed = 0;
  let statusChanges = 0;
  let staleSnapshotsSkipped = 0;

  for (const source of sourceLaunches) {
    const record = toLaunchRecord(source);
    const sourceText = { name: record.name, description: record.mission_description, location: record.location };
    const hash = translationHash(sourceText);
    const { data: existing, error: lookupError } = await supabase
      .from("launches")
      .select("translation_hash,name_cn,mission_description_cn,location_cn,api_updated_at,status")
      .eq("external_id", record.external_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && isOlderApiSnapshot(record.api_updated_at, existing.api_updated_at)) {
      staleSnapshotsSkipped += 1;
      continue;
    }

    const translations = existing?.translation_hash === hash
      ? {
          name_cn: existing.name_cn,
          mission_description_cn: existing.mission_description_cn,
          location_cn: existing.location_cn,
        }
      : await translateLaunch(sourceText);
    if (existing?.translation_hash !== hash) translationsProcessed += 1;
    if (existing && existing.status !== record.status) statusChanges += 1;

    const { error } = await supabase.from("launches").upsert({
      ...record,
      ...translations,
      translation_hash: hash,
      synced_at: new Date().toISOString(),
    }, { onConflict: "external_id" });
    if (error) throw error;
  }

  return {
    recordsProcessed: sourceLaunches.length,
    translationsProcessed,
    statusChanges,
    staleSnapshotsSkipped,
  };
}

async function runHotSync(supabase: SupabaseAdmin, now: Date): Promise<ModeResult> {
  const { from, to } = hotSyncBounds(now);
  const { data: rows, error } = await supabase
    .from("launches")
    .select("external_id,launch_time_utc")
    .gte("launch_time_utc", from)
    .lte("launch_time_utc", to)
    .order("launch_time_utc", { ascending: true })
    .limit(MAX_HOT_CANDIDATES);
  if (error) throw error;

  const candidates = selectHotLaunchCandidates(rows ?? [], now);
  if (!candidates.length) {
    return {
      recordsProcessed: 0,
      translationsProcessed: 0,
      statusChanges: 0,
      staleSnapshotsSkipped: 0,
      candidates: 0,
      apiRequests: 0,
      metadata: { windowFrom: from, windowTo: to, candidates: 0, apiRequests: 0 },
    };
  }

  const launches = await fetchLaunchesByIdsFresh(candidates.map((launch) => launch.external_id));
  const persistResult = await persistLaunchSnapshots(supabase, selectLatestLaunchSnapshots(launches));
  return {
    ...persistResult,
    candidates: candidates.length,
    apiRequests: 1,
    metadata: {
      windowFrom: from,
      windowTo: to,
      candidates: candidates.length,
      apiRequests: 1,
      statusChanges: persistResult.statusChanges,
      staleSnapshotsSkipped: persistResult.staleSnapshotsSkipped,
    },
  };
}

async function runFullSync(supabase: SupabaseAdmin, now: Date): Promise<ModeResult> {
  const [upcoming, recent] = await Promise.all([
    fetchUpcomingLaunches(),
    fetchRecentLaunches(),
  ]);
  let apiRequests = 2;
  const statisticsSource = await fetchCurrentYearLaunchesForStatistics(now)
    .then((value) => ({ value, error: null }))
    .catch((error: unknown) => ({ value: null, error }));
  if (statisticsSource.value) apiRequests += statisticsSource.value.apiRequests;

  const reviewSince = new Date(now.getTime() - RECENT_REVIEW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: reviewRows, error: reviewLookupError } = await supabase
    .from("launches")
    .select("external_id,launch_time_utc,window_end_utc,synced_at")
    .in("status", NON_TERMINAL_STATUSES)
    .gte("launch_time_utc", reviewSince)
    .lte("launch_time_utc", now.toISOString())
    .order("synced_at", { ascending: true })
    .limit(MAX_DETAIL_REVIEWS);
  if (reviewLookupError) throw reviewLookupError;

  const idsToReview = (reviewRows ?? [])
    .filter((launch) => launchWindowEnded(launch, now))
    .map((launch) => launch.external_id);
  const detailRefresh = idsToReview.length
    ? await fetchLaunchesByIdsFresh(idsToReview)
        .then((launches) => ({ launches, error: null }))
        .catch((error: unknown) => ({
          launches: [],
          error: error instanceof Error ? error.message : "Detail refresh failed",
        }))
    : { launches: [], error: null };
  if (idsToReview.length) apiRequests += 1;
  if (detailRefresh.error) {
    console.warn("[sync-launches] batch detail refresh failed", { ids: idsToReview, error: detailRefresh.error });
  }

  const sourceLaunches = selectLatestLaunchSnapshots(upcoming, recent, detailRefresh.launches);
  const persistResult = await persistLaunchSnapshots(supabase, sourceLaunches);

  let statisticsUpdated = false;
  let statisticsRecords = 0;
  let statisticsError: string | null = statisticsSource.error instanceof Error
    ? statisticsSource.error.message
    : statisticsSource.error ? "Statistics fetch failed" : null;
  if (statisticsSource.value) {
    try {
      const statistics = aggregateHomeLaunchStatistics(
        statisticsSource.value.launches,
        statisticsSource.value.periodStart,
        statisticsSource.value.periodEnd,
      );
      const { error: statisticsUpsertError } = await supabase
        .from("launch_statistics")
        .upsert(statistics, { onConflict: "id" });
      if (statisticsUpsertError) throw statisticsUpsertError;
      statisticsUpdated = true;
      statisticsRecords = statistics.total_launches;
      statisticsError = null;
    } catch (error) {
      statisticsError = error instanceof Error ? error.message : "Statistics update failed";
    }
  }

  return {
    ...persistResult,
    candidates: sourceLaunches.length,
    apiRequests,
    metadata: {
      candidates: sourceLaunches.length,
      apiRequests,
      upcomingCandidates: upcoming.length,
      previousCandidates: recent.length,
      detailsReviewed: idsToReview.length,
      detailFailures: detailRefresh.error ? idsToReview.length : 0,
      statusChanges: persistResult.statusChanges,
      staleSnapshotsSkipped: persistResult.staleSnapshotsSkipped,
      statisticsUpdated,
      statisticsRecords,
      statisticsError,
    },
  };
}

export async function syncLaunches(mode: LaunchSyncMode = "full"): Promise<LaunchSyncResult> {
  const supabase = getSupabaseAdmin();
  const startedAt = new Date().toISOString();
  console.log("[sync-launches] started", { mode, startedAt });
  const run = await beginSyncRun(supabase, mode, startedAt);
  if (!run) {
    const completedAt = new Date().toISOString();
    console.log("[sync-launches] skipped", { mode, reason: "already_running", completedAt });
    return {
      mode,
      candidates: 0,
      recordsProcessed: 0,
      translationsProcessed: 0,
      statusChanges: 0,
      staleSnapshotsSkipped: 0,
      apiRequests: 0,
      skipped: "already_running",
      completedAt,
    };
  }

  try {
    const result = mode === "hot"
      ? await runHotSync(supabase, new Date(startedAt))
      : await runFullSync(supabase, new Date(startedAt));
    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase.from("sync_runs").update({
      status: "success",
      completed_at: completedAt,
      records_processed: result.recordsProcessed,
      translations_processed: result.translationsProcessed,
      metadata: result.metadata,
    }).eq("id", run.id);
    if (completionError) throw completionError;
    console.log("[sync-launches] completed", { mode, completedAt, ...result });
    return { mode, completedAt, ...result };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Unknown sync error";
    await supabase.from("sync_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: message,
      metadata: {
        mode,
        failureReason: "upstream_or_persistence_error",
        error: message,
      },
    }).eq("id", run.id);
    console.error("[sync-launches] failed", { mode, error: message });
    throw error;
  }
}
