import { localizeProvider, localizeStatus } from "@/lib/localization";
import { resolveLaunchImageUrl } from "@/lib/image";
import { toLaunchDetails } from "@/lib/launch-details";
import { completeUtcMonthRange } from "@/lib/launch-statistics";
import type { Launch, LaunchLibraryLaunch } from "@/lib/types";

export type UpstreamLaunchPage = {
  count?: number;
  next?: string | null;
  results: LaunchLibraryLaunch[];
};

const launchLibraryBaseUrl = process.env.LL2_BASE_URL ?? "https://ll.thespacedevs.com/2.3.0/";

function launchLibraryUrl(path: string) {
  return new URL(path.replace(/^\//, ""), launchLibraryBaseUrl.endsWith("/") ? launchLibraryBaseUrl : `${launchLibraryBaseUrl}/`);
}

function launchLibraryHeaders() {
  const headers: HeadersInit = { Accept: "application/json" };
  if (process.env.LL2_API_KEY) headers.Authorization = `Token ${process.env.LL2_API_KEY}`;
  return headers;
}

async function requestLaunchPage(url: URL): Promise<UpstreamLaunchPage> {
  const response = await fetch(url, { headers: launchLibraryHeaders(), cache: "no-store" });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const retryMessage = retryAfter ? ` Retry after ${retryAfter} seconds.` : "";
    throw new Error(`Launch Library request failed (${response.status}).${retryMessage}`);
  }
  return await response.json() as UpstreamLaunchPage;
}

async function fetchLaunchPage(path: "upcoming" | "previous", limit: number): Promise<LaunchLibraryLaunch[]> {
  const url = launchLibraryUrl(`launches/${path}/`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("mode", "normal");
  url.searchParams.set("ordering", path === "upcoming" ? "net" : "-net");
  if (path === "upcoming") url.searchParams.set("hide_recent_previous", "true");
  const payload = await requestLaunchPage(url);
  return payload.results ?? [];
}

export function fetchUpcomingLaunches(): Promise<LaunchLibraryLaunch[]> {
  return fetchLaunchPage("upcoming", 100);
}

export function fetchRecentLaunches(): Promise<LaunchLibraryLaunch[]> {
  return fetchLaunchPage("previous", 24);
}

export async function fetchCompletedLaunchesForStatistics(now = new Date()): Promise<{
  launches: LaunchLibraryLaunch[];
  periodStart: string;
  periodEnd: string;
}> {
  const { start: periodStart, end: periodEnd } = completeUtcMonthRange(now);
  const launches: LaunchLibraryLaunch[] = [];
  const limit = 100;

  for (let offset = 0, page = 0; page < 20; page += 1, offset += limit) {
    const url = launchLibraryUrl("launches/previous/");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("mode", "normal");
    url.searchParams.set("ordering", "net");
    url.searchParams.set("net__gte", periodStart);
    url.searchParams.set("net__lt", periodEnd);
    const payload = await requestLaunchPage(url);
    launches.push(...(payload.results ?? []));
    if (!payload.next || launches.length >= (payload.count ?? Number.POSITIVE_INFINITY)) break;
  }

  return { launches, periodStart, periodEnd };
}

export async function fetchLaunchById(id: string): Promise<LaunchLibraryLaunch | null> {
  const url = launchLibraryUrl(`launches/${encodeURIComponent(id)}/`);
  url.searchParams.set("mode", "normal");
  const response = await fetch(url, { headers: launchLibraryHeaders(), next: { revalidate: 900 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Launch Library detail request failed (${response.status}).`);
  return await response.json() as LaunchLibraryLaunch;
}

export function toLaunchRecord(source: LaunchLibraryLaunch): Omit<Launch, "name_cn" | "mission_description_cn" | "location_cn" | "synced_at"> {
  const provider = source.launch_service_provider?.name ?? null;
  const { status, status_cn } = localizeStatus(source.status?.abbrev, source.status?.name);
  const location = source.pad?.location?.name ?? null;
  const details = toLaunchDetails(source);
  return {
    external_id: source.id,
    slug: source.slug || source.id,
    name: source.name,
    mission_description: source.mission?.description ?? null,
    provider,
    provider_cn: localizeProvider(provider),
    rocket_name: source.rocket?.configuration?.full_name ?? null,
    status,
    status_cn,
    launch_time_utc: source.net ?? null,
    window_end_utc: source.window_end ?? null,
    location,
    country_code:
      source.pad?.location?.country?.alpha_3_code
      ?? source.pad?.country?.alpha_3_code
      ?? source.pad?.location?.country_code
      ?? null,
    pad: source.pad?.name ?? null,
    image_url: resolveLaunchImageUrl(source.image) ?? resolveLaunchImageUrl(source.image_url),
    webcast_url: details.video_links[0]?.url ?? source.vidURLs?.[0] ?? null,
    source_url: details.info_links[0]?.url ?? source.url ?? null,
    api_updated_at: source.last_updated ?? null,
  };
}
