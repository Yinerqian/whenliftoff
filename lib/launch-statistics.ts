import type {
  HomeCountryLaunchStat,
  HomeLaunchStats,
  HomeProviderLaunchStat,
  HomeRocketLaunchStat,
  LaunchLibraryCountry,
  LaunchLibraryLaunch,
} from "@/lib/types";

export const HOME_STATISTICS_ID = "current-calendar-year";

export function currentUtcYearRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return { start: start.toISOString(), end: now.toISOString() };
}

function monthKeys(start: string, end: string) {
  const first = new Date(start);
  const last = new Date(end);
  const count = Math.max(1, (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
    return value.toISOString().slice(0, 7);
  });
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function countryFor(launch: LaunchLibraryLaunch): LaunchLibraryCountry | null {
  return launch.pad?.location?.country ?? launch.pad?.country ?? null;
}

function topWithOther<T extends { count: number }>(values: T[], limit: number, other: (count: number) => T) {
  const sorted = [...values].sort((a, b) => b.count - a.count);
  if (sorted.length <= limit) return sorted;
  return [...sorted.slice(0, limit), other(sorted.slice(limit).reduce((sum, item) => sum + item.count, 0))];
}

export function aggregateHomeLaunchStatistics(
  source: LaunchLibraryLaunch[],
  periodStart: string,
  periodEnd: string,
  generatedAt = new Date().toISOString(),
): HomeLaunchStats {
  const startMs = Date.parse(periodStart);
  const endMs = Date.parse(periodEnd);
  const launches = source.filter((launch) => {
    const value = launch.net ? Date.parse(launch.net) : Number.NaN;
    return Number.isFinite(value) && value >= startMs && value < endMs;
  });

  const monthly = new Map(monthKeys(periodStart, periodEnd).map((month) => [month, { month, total: 0, successful: 0 }]));
  const providers = new Map<string, { name: string; abbrev: string | null; image_url: string | null; count: number }>();
  const countries = new Map<string, { code: string; alpha_2_code: string | null; name: string; flag_url: string | null; count: number }>();
  const rockets = new Map<string, { name: string; image_url: string | null; count: number }>();
  const pads = new Set<string>();
  let successful = 0;
  let failed = 0;

  for (const launch of launches) {
    const status = launch.status?.abbrev?.trim().toLowerCase();
    const isSuccessful = status === "success";
    if (isSuccessful) successful += 1;
    if (status === "failure" || status === "partial failure") failed += 1;

    const month = launch.net?.slice(0, 7);
    const monthEntry = month ? monthly.get(month) : null;
    if (monthEntry) {
      monthEntry.total += 1;
      if (isSuccessful) monthEntry.successful += 1;
    }

    const providerName = launch.launch_service_provider?.name?.trim();
    if (providerName) {
      const current = providers.get(providerName);
      providers.set(providerName, {
        name: providerName,
        abbrev: launch.launch_service_provider?.abbrev?.trim() || current?.abbrev || null,
        image_url:
          launch.launch_service_provider?.logo?.thumbnail_url
          || launch.launch_service_provider?.logo?.image_url
          || launch.launch_service_provider?.social_logo?.thumbnail_url
          || launch.launch_service_provider?.social_logo?.image_url
          || current?.image_url
          || null,
        count: (current?.count ?? 0) + 1,
      });
    }

    const country = countryFor(launch);
    const countryCode = country?.alpha_3_code?.trim() || country?.alpha_2_code?.trim();
    if (countryCode && countryCode !== "??") {
      const current = countries.get(countryCode);
      const alpha2 = country?.alpha_2_code?.trim().toLowerCase() || current?.alpha_2_code || null;
      countries.set(countryCode, {
        code: countryCode,
        alpha_2_code: alpha2,
        name: country?.name?.trim() || countryCode,
        flag_url: alpha2 ? `https://flagcdn.io/flags/4x3/${alpha2}.svg` : current?.flag_url || null,
        count: (current?.count ?? 0) + 1,
      });
    }

    const rocket = launch.rocket?.configuration?.full_name?.trim();
    if (rocket) {
      const current = rockets.get(rocket);
      rockets.set(rocket, {
        name: rocket,
        image_url:
          launch.rocket?.configuration?.image?.thumbnail_url
          || launch.rocket?.configuration?.image?.image_url
          || current?.image_url
          || null,
        count: (current?.count ?? 0) + 1,
      });
    }

    const padKey = launch.pad?.id ? String(launch.pad.id) : launch.pad?.name?.trim();
    if (padKey) pads.add(padKey);
  }

  const total = launches.length;
  const providerStats: HomeProviderLaunchStat[] = [...providers.values()]
    .map((item) => ({ ...item, share: percentage(item.count, total) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const countryStats = topWithOther<HomeCountryLaunchStat>(
    [...countries.values()].map((item) => ({ ...item, share: percentage(item.count, total) })),
    7,
    (count) => ({ code: "OTH", alpha_2_code: null, name: "其他", flag_url: null, count, share: percentage(count, total), is_other: true }),
  );
  const rocketStats = topWithOther<HomeRocketLaunchStat>(
    [...rockets.values()].map((item) => ({ ...item, share: percentage(item.count, total) })),
    7,
    (count) => ({ name: "其他", image_url: null, count, share: percentage(count, total), is_other: true }),
  );
  const terminal = successful + failed;

  return {
    id: HOME_STATISTICS_ID,
    period_start: periodStart,
    period_end: periodEnd,
    generated_at: generatedAt,
    total_launches: total,
    successful_launches: successful,
    failed_launches: failed,
    success_rate: percentage(successful, terminal),
    active_providers: providers.size,
    active_countries: countries.size,
    active_pads: pads.size,
    monthly: [...monthly.values()],
    providers: providerStats,
    countries: countryStats,
    rockets: rocketStats,
  };
}
