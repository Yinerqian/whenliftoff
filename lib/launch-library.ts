import { localizeProvider, localizeStatus } from "@/lib/localization";
import { resolveLaunchImageUrl } from "@/lib/image";
import type { Launch, LaunchLibraryLaunch } from "@/lib/types";

export type UpstreamLaunchPage = { results: LaunchLibraryLaunch[] };

export async function fetchUpcomingLaunches(): Promise<LaunchLibraryLaunch[]> {
  const url = new URL("https://ll.thespacedevs.com/2.3.0/launches/upcoming/");
  url.searchParams.set("limit", "100");
  url.searchParams.set("mode", "normal");
  url.searchParams.set("ordering", "net");
  url.searchParams.set("hide_recent_previous", "true");
  const headers: HeadersInit = { Accept: "application/json" };
  // LL2 accepts anonymous requests; deployments with a token can set this standard header.
  if (process.env.LL2_API_KEY) headers.Authorization = `Token ${process.env.LL2_API_KEY}`;
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Launch Library request failed (${response.status}).`);
  const payload = await response.json() as UpstreamLaunchPage;
  return payload.results ?? [];
}

export async function fetchLaunchById(id: string): Promise<LaunchLibraryLaunch | null> {
  const url = new URL(`https://ll.thespacedevs.com/2.3.0/launches/${encodeURIComponent(id)}/`);
  url.searchParams.set("mode", "normal");
  const headers: HeadersInit = { Accept: "application/json" };
  if (process.env.LL2_API_KEY) headers.Authorization = `Token ${process.env.LL2_API_KEY}`;
  const response = await fetch(url, { headers, next: { revalidate: 900 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Launch Library detail request failed (${response.status}).`);
  return await response.json() as LaunchLibraryLaunch;
}

export function toLaunchRecord(source: LaunchLibraryLaunch): Omit<Launch, "name_cn" | "mission_description_cn" | "location_cn" | "synced_at"> {
  const provider = source.launch_service_provider?.name ?? null;
  const { status, status_cn } = localizeStatus(source.status?.abbrev, source.status?.name);
  const location = source.pad?.location?.name ?? null;
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
    country_code: source.pad?.location?.country_code ?? null,
    pad: source.pad?.name ?? null,
    image_url: resolveLaunchImageUrl(source.image) ?? resolveLaunchImageUrl(source.image_url),
    webcast_url: source.vidURLs?.[0] ?? null,
    source_url: source.url ?? null,
    api_updated_at: source.last_updated ?? null,
  };
}
