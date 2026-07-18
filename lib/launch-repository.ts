import { cache } from "react";
import { fetchLaunchById, toLaunchRecord } from "@/lib/launch-library";
import { toLaunchDetails } from "@/lib/launch-details";
import { HOME_STATISTICS_ID } from "@/lib/launch-statistics";
import { getLaunchStatusMeta } from "@/lib/launch-status";
import { getSupabaseAdmin } from "@/lib/supabase";
import { beijingMonthRange } from "@/lib/time";
import type { HomeLaunchStats, Launch, LaunchLibraryLaunch, LaunchQuery, LaunchResult } from "@/lib/types";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

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

  const items = (data ?? []) as Launch[];
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
  const { data: latest } = await supabase
    .from("sync_runs")
    .select("completed_at")
    .eq("source", "launch-library-2")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    items,
    nextCursor: offset + items.length < total ? encodeOffset(offset + items.length) : null,
    lastSyncedAt: latest?.completed_at ?? null,
    providers: [...new Set((providerRows ?? []).map((row) => row.provider).filter((provider): provider is string => Boolean(provider)))],
    monthTotal: monthTotal ?? monthlyProviderRows?.length ?? 0,
    providerCounts: [...monthlyCounts].map(([provider, count]) => ({ provider, count })),
  };
}

function fallbackLaunch(source: LaunchLibraryLaunch): Launch {
  const record = toLaunchRecord(source);
  const starlinkGroup = source.name.match(/Starlink Group\s+([\d-]+)/i)?.[1];
  const isVandenberg = /Vandenberg/i.test(record.location || "");
  return {
    ...record,
    name_cn: starlinkGroup ? `星链 ${starlinkGroup}` : null,
    mission_description_cn: starlinkGroup ? "一批星链卫星将加入 SpaceX 太空互联网通信星座，为全球宽带服务补充轨道容量。" : null,
    location_cn: isVandenberg ? "美国 加州 范登堡太空军基地" : null,
    synced_at: new Date().toISOString(),
    details: toLaunchDetails(source),
  };
}

function mergeLaunchDetails(base: Launch, source: LaunchLibraryLaunch): Launch {
  const latest = toLaunchRecord(source);
  return {
    ...base,
    ...latest,
    name_cn: base.name_cn,
    mission_description_cn: base.mission_description_cn,
    location_cn: base.location_cn,
    provider_cn: base.provider_cn ?? latest.provider_cn,
    synced_at: base.synced_at,
    details: toLaunchDetails(source),
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

  if (stored) {
    const source = await fetchLaunchById(stored.external_id).catch(() => null);
    return source ? mergeLaunchDetails(stored, source) : stored;
  }

  const source = await fetchLaunchById(value);
  if (!source) return null;
  return fallbackLaunch(source);
}

export const getLaunchById = cache(getLaunchByIdUncached);

export async function getRecentCompletedLaunches(limit = 5): Promise<Launch[]> {
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
    .slice(0, safeLimit);
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
  const stored = data as Launch | null;
  if (!stored) return null;
  const source = await fetchLaunchById(stored.external_id).catch(() => null);
  return source ? mergeLaunchDetails(stored, source) : stored;
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
