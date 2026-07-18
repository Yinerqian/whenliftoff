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

const NON_TERMINAL_STATUSES = ["Go", "TBC", "TBD", "Hold", "In Flight"];
const RECENT_REVIEW_DAYS = 30;
const MAX_DETAIL_REVIEWS = 24;

function launchWindowEnded(launch: { launch_time_utc: string | null; window_end_utc: string | null }, now: Date) {
  const end = Date.parse(launch.window_end_utc ?? launch.launch_time_utc ?? "");
  return Number.isFinite(end) && end <= now.getTime();
}

function isOlderApiSnapshot(incoming: string | null, existing: string | null | undefined) {
  const incomingTime = Date.parse(incoming ?? "");
  const existingTime = Date.parse(existing ?? "");
  return Number.isFinite(existingTime) && (!Number.isFinite(incomingTime) || incomingTime < existingTime);
}

export async function syncLaunches() {
  const supabase = getSupabaseAdmin();
  const startedAt = new Date().toISOString();
  console.log("[sync-launches] started", { startedAt });
  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ source: "launch-library-2", status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    const [upcoming, recent] = await Promise.all([
      fetchUpcomingLaunches(),
      fetchRecentLaunches(),
    ]);
    const statisticsSource = await fetchCurrentYearLaunchesForStatistics()
      .then((value) => ({ value, error: null }))
      .catch((error: unknown) => ({ value: null, error }));
    const now = new Date();
    const recentIds = recent.map((launch) => launch.id);
    const { data: knownRecent, error: recentLookupError } = recentIds.length
      ? await supabase.from("launches").select("external_id").in("external_id", recentIds)
      : { data: [], error: null };
    if (recentLookupError) throw recentLookupError;
    const knownRecentIds = new Set((knownRecent ?? []).map((launch) => launch.external_id));
    const recentToRefresh = recent.filter((launch) => knownRecentIds.has(launch.id));
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
    const detailRefresh = await fetchLaunchesByIdsFresh(idsToReview)
      .then((launches) => ({ launches, error: null }))
      .catch((error: unknown) => ({
        launches: [],
        error: error instanceof Error ? error.message : "Detail refresh failed",
      }));
    if (detailRefresh.error) {
      console.warn("[sync-launches] batch detail refresh failed", { ids: idsToReview, error: detailRefresh.error });
    }
    const sourceLaunches = selectLatestLaunchSnapshots(upcoming, recentToRefresh, detailRefresh.launches);
    let translated = 0;
    let staleSnapshotsSkipped = 0;
    for (const source of sourceLaunches) {
      const record = toLaunchRecord(source);
      const sourceText = { name: record.name, description: record.mission_description, location: record.location };
      const hash = translationHash(sourceText);
      const { data: existing, error: lookupError } = await supabase
        .from("launches")
        .select("translation_hash,name_cn,mission_description_cn,location_cn,api_updated_at")
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
      if (existing?.translation_hash !== hash) translated += 1;
      const { error } = await supabase.from("launches").upsert({
        ...record,
        ...translations,
        translation_hash: hash,
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" });
      if (error) throw error;
    }

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

    const completedAt = new Date().toISOString();
    await supabase.from("sync_runs").update({
      status: "success", completed_at: completedAt, records_processed: sourceLaunches.length, translations_processed: translated,
    }).eq("id", run.id);
    console.log("[sync-launches] completed", {
      completedAt,
      recordsProcessed: sourceLaunches.length,
      detailsReviewed: idsToReview.length,
      detailFailures: detailRefresh.error ? idsToReview.length : 0,
      staleSnapshotsSkipped,
    });
    return {
      recordsProcessed: sourceLaunches.length,
      translationsProcessed: translated,
      detailsReviewed: idsToReview.length,
      detailFailures: detailRefresh.error ? idsToReview.length : 0,
      staleSnapshotsSkipped,
      statisticsUpdated,
      statisticsRecords,
      statisticsError,
      completedAt,
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Unknown sync error";
    await supabase.from("sync_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message }).eq("id", run.id);
    console.error("[sync-launches] failed", { error: message });
    throw error;
  }
}
