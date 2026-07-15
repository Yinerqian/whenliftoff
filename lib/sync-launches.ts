import { fetchUpcomingLaunches, toLaunchRecord } from "@/lib/launch-library";
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
    const sourceLaunches = await fetchUpcomingLaunches();
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
    const completedAt = new Date().toISOString();
    await supabase.from("sync_runs").update({
      status: "success", completed_at: completedAt, records_processed: sourceLaunches.length, translations_processed: translated,
    }).eq("id", run.id);
    return { recordsProcessed: sourceLaunches.length, translationsProcessed: translated, completedAt };
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
