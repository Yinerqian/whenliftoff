import { resolveLaunchImageUrl } from "@/lib/image";
import type {
  LaunchDetails,
  LaunchLibraryLaunch,
  LaunchLibraryTimelineEntry,
  LaunchLibraryUrl,
  LaunchResourceLink,
  LaunchTimelineEvent,
} from "@/lib/types";

const MISSION_TYPE_CN: Record<string, string> = {
  Communications: "通信任务",
  "Government/Top Secret": "政府 / 保密任务",
  "Earth Science": "地球科学",
  Navigation: "导航任务",
  Technology: "技术验证",
  "Human Exploration": "载人探索",
  "Planetary Science": "行星科学",
  Astrophysics: "天体物理",
  "Test Flight": "试飞任务",
  "Dedicated Rideshare": "专属拼车任务",
  Resupply: "空间站补给",
};

const ORBIT_CN: Record<string, string> = {
  LEO: "低地球轨道",
  SSO: "太阳同步轨道",
  GTO: "地球同步转移轨道",
  GEO: "地球静止轨道",
  "Direct-GEO": "地球静止轨道",
  MEO: "中地球轨道",
  HEO: "高椭圆轨道",
  PO: "极地轨道",
  "Lunar Orbit": "月球轨道",
  Suborbital: "亚轨道",
};

const PROVIDER_TYPE_CN: Record<string, string> = {
  Commercial: "商业机构",
  Government: "政府机构",
  Multinational: "跨国机构",
  Educational: "教育机构",
  Private: "私营机构",
};

const TIMELINE_TITLE_CN: Record<string, string> = {
  "GO for Prop Load": "确认推进剂加注",
  "Prop Load": "开始推进剂加注",
  "Stage 1 LOX Load": "一级液氧加注",
  "Stage 1 LNG Load": "一级液态甲烷加注",
  "Stage 2 LOX Load": "二级液氧加注",
  "Stage 2 LNG Load": "二级液态甲烷加注",
  "Stage 1 Propellant Load Complete": "一级推进剂加注完成",
  "Stage 2 Propellant Load Complete": "二级推进剂加注完成",
  "Engine Chill": "发动机预冷",
  Startup: "飞行计算机接管",
  "Tank Press": "燃料箱增压",
  "GO for Launch": "确认发射",
  Ignition: "发动机点火",
  "Flame Deflector Activation": "火焰导流系统启动",
  "Excitement Guaranteed": "发射时刻",
  Liftoff: "火箭起飞",
  "Max-Q": "最大动压",
  MECO: "一级发动机关机",
  "Stage 2 Separation": "级间分离",
  "SES-1": "二级发动机第一次点火",
  "Fairing Separation": "整流罩分离",
  "Entry Burn Startup": "一级再入点火",
  "Entry Burn Shutdown": "一级再入关机",
  "Booster Boostback Burn Startup": "一级返程点火",
  "Booster Boostback Burn Shutdown": "一级返程关机",
  "Stage 1 Landing Burn": "一级着陆点火",
  "SECO-1": "二级发动机第一次关机",
  "Stage 1 Landing": "一级回收着陆",
  "Payload Deployment": "载荷部署",
  "Payload Deployment Sequence Start": "载荷部署序列开始",
  "Payload Deployment Sequence End": "载荷部署序列完成",
  "SEB-2": "二级发动机第二次点火",
  "Atmospheric Entry": "进入大气层",
  "Starship Transonic": "星舰进入跨声速",
  "Starship Subsonic": "星舰进入亚声速",
  "Starship Landing Burn": "星舰着陆点火",
  "Landing Flip": "星舰着陆翻转",
  "Starship Landing": "星舰着陆",
};

const TIMELINE_DESCRIPTION_CN: Record<string, string> = {
  "GO for Prop Load": "发射指挥确认可以开始加注推进剂。",
  "Prop Load": "火箭开始装载推进剂。",
  "Stage 1 LOX Load": "一级火箭开始装载液氧。",
  "Stage 1 LNG Load": "一级火箭开始装载液态甲烷。",
  "Stage 2 LOX Load": "二级火箭开始装载液氧。",
  "Stage 2 LNG Load": "二级火箭开始装载液态甲烷。",
  "Stage 1 Propellant Load Complete": "一级火箭推进剂加注完成。",
  "Stage 2 Propellant Load Complete": "二级火箭推进剂加注完成。",
  "Engine Chill": "发动机进入发射前预冷程序。",
  Startup: "飞行计算机接管倒计时并执行最终检查。",
  "Tank Press": "推进剂贮箱增压至飞行压力。",
  "GO for Launch": "发射指挥确认任务可以发射。",
  Ignition: "发动机点火序列启动。",
  "Flame Deflector Activation": "发射台火焰导流系统在发动机点火前启动。",
  "Excitement Guaranteed": "火箭进入正式发射时刻。",
  Liftoff: "火箭离开发射台。",
  "Max-Q": "火箭通过最大气动压力点。",
  MECO: "一级发动机完成主关机。",
  "Stage 2 Separation": "一、二级火箭完成分离。",
  "SES-1": "二级发动机开始第一次点火。",
  "Fairing Separation": "整流罩完成分离。",
  "Entry Burn Startup": "一级助推器开始再入点火。",
  "Entry Burn Shutdown": "一级助推器结束再入点火。",
  "Booster Boostback Burn Startup": "一级助推器开始返程点火。",
  "Booster Boostback Burn Shutdown": "一级助推器结束返程点火。",
  "Stage 1 Landing Burn": "一级助推器开始着陆点火。",
  "SECO-1": "二级发动机完成第一次关机。",
  "Stage 1 Landing": "一级助推器完成回收着陆。",
  "Payload Deployment": "载荷从上面级分离并开始独立运行。",
  "Payload Deployment Sequence Start": "载荷部署序列开始。",
  "Payload Deployment Sequence End": "载荷部署序列完成。",
  "SEB-2": "二级发动机执行第二次点火。",
  "Atmospheric Entry": "星舰开始进入大气层。",
  "Starship Transonic": "星舰速度降低至跨声速范围。",
  "Starship Subsonic": "星舰速度降低至亚声速。",
  "Starship Landing Burn": "星舰上面级启动着陆点火。",
  "Landing Flip": "星舰执行着陆翻转并调整姿态。",
  "Starship Landing": "星舰上面级完成着陆。",
};

const KEY_EVENT_PATTERNS = [
  /^Ignition$/i,
  /^Liftoff$/i,
  /^Max-Q$/i,
  /^MECO/i,
  /Stage .* Separation/i,
  /^SECO/i,
  /Payload.*Deploy/i,
  /Stage 1 Landing$/i,
];

function asNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseRelativeTime(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return null;
  const [, negative, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  const total = Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  if (!Number.isFinite(total)) return null;
  return Math.round(total * (negative ? -1 : 1));
}

export function formatTimelineOffset(seconds: number) {
  const sign = seconds < 0 ? "−" : "+";
  const total = Math.abs(Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  const clock = hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  return `T${sign}${clock}`;
}

function timelineTitle(code: string) {
  return TIMELINE_TITLE_CN[code] ?? code;
}

function timelineDescription(code: string, source: LaunchLibraryTimelineEntry) {
  return TIMELINE_DESCRIPTION_CN[code] ?? source.description ?? source.type?.description ?? null;
}

function isKeyEvent(code: string) {
  return KEY_EVENT_PATTERNS.some((pattern) => pattern.test(code));
}

export function normalizeTimeline(entries: LaunchLibraryTimelineEntry[] | null | undefined): LaunchTimelineEvent[] {
  const normalized: LaunchTimelineEvent[] = [];
  for (const entry of entries ?? []) {
    const offset = parseRelativeTime(entry.relative_time);
    const code = entry.type?.abbrev?.trim() ?? "";
    if (offset === null || !code) continue;
    normalized.push({
      id: entry.type?.id ?? null,
      code,
      title: timelineTitle(code),
      description: timelineDescription(code, entry),
      relative_time: entry.relative_time ?? "P0D",
      offset_seconds: offset,
      is_key_event: isKeyEvent(code),
      phase: offset < 0 ? "prelaunch" : offset === 0 ? "liftoff" : "flight",
    });
  }
  return normalized.sort((left, right) => left.offset_seconds - right.offset_seconds);
}

export function selectKeyTimelineEvents(events: LaunchTimelineEvent[], limit = 8) {
  const keyEvents = events.filter((event) => event.is_key_event);
  return (keyEvents.length ? keyEvents : events).slice(0, limit);
}

function normalizeLinks(links: LaunchLibraryUrl[] | null | undefined, provider: string | null): LaunchResourceLink[] {
  const providerName = provider?.trim().toLocaleLowerCase() ?? "";
  return (links ?? [])
    .map((link) => {
      const url = safeExternalUrl(link.url);
      if (!url) return null;
      const type = link.type?.name?.trim() ?? null;
      const publisher = link.publisher?.trim() ?? null;
      const source = link.source?.trim() ?? null;
      const official = /^official\b/i.test(type ?? "");
      const publishedByProvider = Boolean(providerName) && [publisher, source]
        .some((value) => value?.toLocaleLowerCase().includes(providerName));
      return {
        url,
        title: link.title?.trim() ?? null,
        source,
        publisher,
        type,
        language: link.language?.code ?? link.language?.name ?? null,
        feature_image: safeExternalUrl(link.feature_image),
        start_time: link.start_time ?? null,
        live: link.live ?? null,
        official,
        sort_rank: (official ? 2000 : 0) + (publishedByProvider ? 1000 : 0) + (link.priority ?? 0),
      };
    })
    .filter((link): link is NonNullable<typeof link> => link !== null)
    .sort((left, right) => right.sort_rank - left.sort_rank)
    .map(({ sort_rank: _sortRank, ...link }) => link);
}

export function localizeMissionType(value: string | null | undefined) {
  return value ? MISSION_TYPE_CN[value] ?? value : null;
}

export function localizeOrbit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name && !abbrev) return null;
  return (abbrev && ORBIT_CN[abbrev]) || (name && ORBIT_CN[name]) || name || abbrev || null;
}

export function localizeProviderType(value: string | null | undefined) {
  return value ? PROVIDER_TYPE_CN[value] ?? value : null;
}

const NET_PRECISION_CN: Record<string, string> = {
  second: "秒级",
  minute: "分钟级",
  hour: "小时级",
  day: "日期级",
  month: "月份级",
  quarter: "季度级",
  year: "年份级",
};

export function localizeNetPrecision(value: string | null | undefined) {
  return value ? NET_PRECISION_CN[value.toLowerCase()] ?? value : null;
}

export function toLaunchDetails(source: LaunchLibraryLaunch): LaunchDetails {
  const provider = source.launch_service_provider?.name ?? null;
  const configuration = source.rocket?.configuration;
  const launcherStage = source.rocket?.launcher_stage?.[0];
  const landing = launcherStage?.landing;
  const latitude = asNumber(source.pad?.latitude);
  const longitude = asNumber(source.pad?.longitude);
  const suppliedMapUrl = safeExternalUrl(source.pad?.map_url);
  const mapUrl = suppliedMapUrl ?? (latitude !== null && longitude !== null
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null);

  return {
    window_start_utc: source.window_start ?? null,
    net_precision: source.net_precision?.name ?? source.net_precision?.abbrev ?? null,
    mission_type: source.mission?.type ?? null,
    orbit_name: source.mission?.orbit?.name ?? null,
    orbit_abbrev: source.mission?.orbit?.abbrev ?? null,
    provider_type: source.launch_service_provider?.type?.name ?? null,
    rocket_manufacturer: configuration?.manufacturer?.name ?? null,
    rocket_variant: configuration?.variant ?? null,
    rocket_reusable: configuration?.reusable ?? null,
    rocket_min_stage: configuration?.min_stage ?? null,
    rocket_max_stage: configuration?.max_stage ?? null,
    rocket_length_m: configuration?.length ?? null,
    rocket_diameter_m: configuration?.diameter ?? null,
    rocket_launch_mass_t: configuration?.launch_mass ?? null,
    rocket_leo_capacity_kg: configuration?.leo_capacity ?? null,
    rocket_gto_capacity_kg: configuration?.gto_capacity ?? null,
    booster_serial: launcherStage?.launcher?.serial_number ?? null,
    booster_flight_number: launcherStage?.launcher_flight_number ?? null,
    booster_reused: launcherStage?.reused ?? null,
    landing_attempt: landing?.attempt ?? null,
    landing_success: landing?.success ?? null,
    landing_description: landing?.description ?? null,
    landing_location: landing?.landing_location?.name ?? landing?.landing_location?.abbrev ?? null,
    landing_type: landing?.type?.name ?? landing?.type?.abbrev ?? null,
    probability: source.probability ?? null,
    weather_concerns: source.weather_concerns ?? null,
    latitude,
    longitude,
    map_url: mapUrl,
    map_image_url: resolveLaunchImageUrl(source.pad?.map_image),
    timeline: normalizeTimeline(source.timeline),
    video_links: normalizeLinks(source.vid_urls, provider),
    info_links: normalizeLinks(source.info_urls, provider),
    infographic_url: resolveLaunchImageUrl(source.infographic),
    mission_patch_url: resolveLaunchImageUrl(source.mission_patches?.[0]?.image),
    flightclub_url: safeExternalUrl(source.flightclub_url),
  };
}
