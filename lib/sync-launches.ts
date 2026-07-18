import {
  fetchCompletedLaunchesForStatistics,
  fetchRecentLaunches,
  fetchUpcomingLaunches,
  toLaunchRecord,
} from "@/lib/launch-library";
import { aggregateHomeLaunchStatistics } from "@/lib/launch-statistics";
import { getSupabaseAdmin } from "@/lib/supabase";
import { translateLaunch, translationHash } from "@/lib/translation";

export async function syncLaunches() {
  const supabase = getSupabaseAdmin();
  const startedAt = new Date().toISOString();
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
    const statisticsSource = await fetchCompletedLaunchesForStatistics()
      .then((value) => ({ value, error: null }))
      .catch((error: unknown) => ({ value: null, error }));
    const recentIds = recent.map((launch) => launch.id);
    const { data: knownRecent, error: recentLookupError } = recentIds.length
      ? await supabase.from("launches").select("external_id").in("external_id", recentIds)
      : { data: [], error: null };
    if (recentLookupError) throw recentLookupError;
    const knownRecentIds = new Set((knownRecent ?? []).map((launch) => launch.external_id));
    const recentToRefresh = recent.filter((launch) => knownRecentIds.has(launch.id));
    const sourceLaunches = [...new Map([...upcoming, ...recentToRefresh].map((launch) => [launch.id, launch])).values()];
    let translated = 0;
    for (const source of sourceLaunches) {
      const record = toLaunchRecord(source);
      const sourceText = { name: record.name, description: record.mission_description, location: record.location };
      const hash = translationHash(sourceText);
      const { data: existing, error: lookupError } = await supabase
        .from("launches")
        .select("translation_hash,name_cn,mission_description_cn,location_cn")
        .eq("external_id", record.external_id)
        .maybeSingle();
      if (lookupError) throw lookupError;

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
    return {
      recordsProcessed: sourceLaunches.length,
      translationsProcessed: translated,
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
    throw error;
  }
}
