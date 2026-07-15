import { fetchLaunchById, toLaunchRecord } from "@/lib/launch-library";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Launch, LaunchQuery, LaunchResult } from "@/lib/types";

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
  if (query.from) request = request.gte("launch_time_utc", query.from);
  if (query.to) request = request.lte("launch_time_utc", query.to);

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
  };
}

export async function getLaunchById(id: string): Promise<Launch | null> {
  const value = id.trim().slice(0, 140);
  if (!value) return null;
  const supabase = getSupabaseAdmin();
  const { data: byId, error: idError } = await supabase
    .from("launches")
    .select("*")
    .eq("external_id", value)
    .maybeSingle();
  if (idError) throw idError;
  if (byId) return byId as Launch;

  const { data: bySlug, error: slugError } = await supabase
    .from("launches")
    .select("*")
    .eq("slug", value)
    .maybeSingle();
  if (slugError) throw slugError;
  if (bySlug) return bySlug as Launch;

  const source = await fetchLaunchById(value);
  if (!source) return null;
  const record = toLaunchRecord(source);
  const providerCn: Record<string, string> = {
    SpaceX: "太空探索技术公司",
    NASA: "美国国家航空航天局",
    "Rocket Lab": "火箭实验室",
    "Blue Origin": "蓝色起源",
    Roscosmos: "俄罗斯航天国家集团",
  };
  const statusCn: Record<string, string> = {
    Go: "计划发射",
    TBD: "时间待定",
    TBC: "时间待确认",
    Success: "发射成功",
    Failure: "发射失败",
    "Partial Failure": "部分失败",
    Hold: "暂停",
    "In Flight": "飞行中",
  };
  const starlinkGroup = source.name.match(/Starlink Group\s+([\d-]+)/i)?.[1];
  const isVandenberg = /Vandenberg/i.test(record.location || "");
  return {
    ...record,
    provider_cn: record.provider ? providerCn[record.provider] ?? null : null,
    status_cn: statusCn[record.status] ?? source.status?.name ?? "状态待确认",
    name_cn: starlinkGroup ? `星链 ${starlinkGroup}` : null,
    mission_description_cn: starlinkGroup ? "一批星链卫星将加入 SpaceX 太空互联网通信星座，为全球宽带服务补充轨道容量。" : null,
    location_cn: isVandenberg ? "美国 加州 范登堡太空军基地" : null,
    synced_at: new Date().toISOString(),
  };
}
