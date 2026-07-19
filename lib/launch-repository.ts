import { cache } from "react";
import { HOME_STATISTICS_ID } from "@/lib/launch-statistics";
import { ALL_CURRENT_MONTH_LIMIT } from "@/lib/launch-pagination";
import { localizeLaunchName, localizeRocketName } from "@/lib/localization";
import { getLaunchStatusMeta } from "@/lib/launch-status";
import { getSupabaseAdmin } from "@/lib/supabase";
import { beijingMonthRange } from "@/lib/time";
import type { HomeLaunchStats, Launch, LaunchQuery, LaunchResult } from "@/lib/types";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = ALL_CURRENT_MONTH_LIMIT;

function localizeLaunchPresentation(launch: Launch): Launch {
  return {
    ...launch,
    name_cn: localizeLaunchName(launch.name_cn, launch.name),
    rocket_name: localizeRocketName(launch.rocket_name),
  };
}

function decodeOffset(cursor?: string) {
  if (!cursor) return 0;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isInteger(value.offset) && value.offset >= 0 ? value.offset : 0;
  } catch {
    return 0;
  }
}

function encodeOffset(offset: number) {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

function cleanSearch(input: string) {
  return input.replace(/[,%()]/g, " ").trim().slice(0, 100);
}

export async function searchLaunches(query: LaunchQuery): Promise<LaunchResult> {
  const supabase = getSupabaseAdmin();
  const offset = decodeOffset(query.cursor);
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  let request = supabase.from("launches").select("*", { count: "exact" });

  const search = query.q ? cleanSearch(query.q) : "";
  if (search) {
    const pattern = `*${search}*`;
    request = request.or([
      `name.ilike.${pattern}`,
      `name_cn.ilike.${pattern}`,
      `rocket_name.ilike.${pattern}`,
      `provider.ilike.${pattern}`,
      `provider_cn.ilike.${pattern}`,
      `location.ilike.${pattern}`,
      `location_cn.ilike.${pattern}`,
    ].join(","));
  }
  if (query.status) request = request.eq("status", query.status.slice(0, 40));
  if (query.provider) request = request.eq("provider", query.provider.slice(0, 100));
  if (query.country) request = request.eq("country_code", query.country.slice(0, 3).toUpperCase());
  const monthRange = beijingMonthRange();
  if (query.currentMonth) {
    request = request
      .gte("launch_time_utc", monthRange.from)
      .lt("launch_time_utc", monthRange.to);
  } else if (query.futureAfterCurrentMonth) {
    request = request.gte("launch_time_utc", monthRange.to);
  } else {
    if (query.from) request = request.gte("launch_time_utc", query.from);
    if (query.to) request = request.lte("launch_time_utc", query.to);
  }

  const { data, error, count } = await request
    .order("launch_time_utc", { ascending: true, nullsFirst: false })
    .order("external_id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const items = ((data ?? []) as Launch[]).map(localizeLaunchPresentation);
  const total = count ?? 0;
  const { data: providerRows, error: providerError } = await supabase
    .from("launches")
    .select("provider")
    .not("provider", "is", null)
    .order("provider", { ascending: true })
    .limit(500);
  if (providerError) throw providerError;
  const { data: monthlyProviderRows, error: monthlyProviderError, count: monthTotal } = await supabase
    .from("launches")
    .select("provider", { count: "exact" })
    .gte("launch_time_utc", monthRange.from)
    .lt("launch_time_utc", monthRange.to)
    .order("launch_time_utc", { ascending: true })
    .limit(1000);
  if (monthlyProviderError) throw monthlyProviderError;
  const monthlyCounts = new Map<string, number>();
  (monthlyProviderRows ?? []).forEach((row) => {
    if (row.provider) monthlyCounts.set(row.provider, (monthlyCounts.get(row.provider) ?? 0) + 1);
  });
  const latestSyncedAt = await getLatestLaunchSyncAt(supabase);

  return {
    items,
    nextCursor: offset + items.length < total ? encodeOffset(offset + items.length) : null,
    lastSyncedAt: latestSyncedAt,
    providers: [...new Set((providerRows ?? []).map((row) => row.provider).filter((provider): provider is string => Boolean(provider)))],
    monthTotal: monthTotal ?? monthlyProviderRows?.length ?? 0,
    providerCounts: [...monthlyCounts].map(([provider, count]) => ({ provider, count })),
  };
}

async function getLaunchByIdUncached(id: string): Promise<Launch | null> {
  const value = id.trim().slice(0, 140);
  if (!value) return null;
  const supabase = getSupabaseAdmin();

  let stored: Launch | null = null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    const { data: byId, error: idError } = await supabase
      .from("launches")
      .select("*")
      .eq("external_id", value)
      .maybeSingle();
    if (idError) throw idError;
    stored = byId as Launch | null;
  }

  if (!stored) {
    const { data: bySlug, error: slugError } = await supabase
      .from("launches")
      .select("*")
      .eq("slug", value)
      .maybeSingle();
    if (slugError) throw slugError;
    stored = bySlug as Launch | null;
  }

  return stored ? localizeLaunchPresentation(stored) : null;
}

export const getLaunchById = cache(getLaunchByIdUncached);

async function getLatestLaunchSyncAt(supabase = getSupabaseAdmin()) {
  const { data, error } = await supabase
    .from("sync_runs")
    .select("completed_at")
    .eq("source", "launch-library-2")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.completed_at ?? null;
}

export async function getLaunchesByIds(ids: string[]): Promise<Launch[]> {
  const uniqueIds = [...new Set(ids)].slice(0, 100);
  if (!uniqueIds.length) return [];
  const { data, error } = await getSupabaseAdmin()
    .from("launches")
    .select("*")
    .in("external_id", uniqueIds);
  if (error) throw error;
  const byId = new Map(((data ?? []) as Launch[]).map((launch) => {
    const localized = localizeLaunchPresentation(launch);
    return [localized.external_id, localized];
  }));
  return uniqueIds.flatMap((id) => {
    const launch = byId.get(id);
    return launch ? [launch] : [];
  });
}

export async function getLaunchLiveSnapshot(ids: string[]) {
  const [items, recentCompleted, lastSyncedAt] = await Promise.all([
    getLaunchesByIds(ids),
    getRecentCompletedLaunches(3),
    getLatestLaunchSyncAt(),
  ]);
  return { items, recentCompleted, lastSyncedAt };
}

export async function getRecentCompletedLaunches(limit = 3): Promise<Launch[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const { data, error } = await getSupabaseAdmin()
    .from("launches")
    .select("*")
    .lte("launch_time_utc", new Date().toISOString())
    .order("launch_time_utc", { ascending: false, nullsFirst: false })
    .order("external_id", { ascending: false })
    .limit(Math.max(safeLimit * 10, 50));
  if (error) throw error;

  return ((data ?? []) as Launch[])
    .filter((launch) => {
      const tone = getLaunchStatusMeta(launch.status, launch.status_cn).tone;
      return tone === "success" || tone === "failed";
    })
    .slice(0, safeLimit)
    .map(localizeLaunchPresentation);
}

export async function getNextUpcomingLaunch(): Promise<Launch | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("launches")
    .select("*")
    .gte("launch_time_utc", new Date().toISOString())
    .order("launch_time_utc", { ascending: true, nullsFirst: false })
    .order("external_id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? localizeLaunchPresentation(data as Launch) : null;
}

export async function getHomeLaunchStatistics(): Promise<HomeLaunchStats | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("launch_statistics")
    .select("*")
    .eq("id", HOME_STATISTICS_ID)
    .maybeSingle();
  if (error) throw error;
  return data as HomeLaunchStats | null;
}
