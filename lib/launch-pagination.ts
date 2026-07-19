export type LaunchPageScope = "month" | "future";

export const LAUNCH_PAGE_LIMIT = 18;
export const FILTERED_LAUNCH_API_LIMIT = 24;
export const ALL_CURRENT_MONTH_LIMIT = 1000;

export function isDefaultAllAgencies(filters: { q: string; provider: string }) {
  return !filters.q.trim() && !filters.provider;
}

export type LaunchPageRequest = {
  scope: LaunchPageScope;
  cursor?: string;
};

export function nextLaunchPage(cursor: string | null, scope: LaunchPageScope): LaunchPageRequest | null {
  if (cursor) return { scope, cursor };
  if (scope === "month") return { scope: "future" };
  return null;
}

export function limitPastLaunches<T extends { launch_time_utc: string | null }>(
  launches: T[],
  now = Date.now(),
  limit = 3,
) {
  const safeLimit = Math.max(0, limit);
  const pastLaunches = launches
    .filter((launch) => {
      const launchTime = Date.parse(launch.launch_time_utc ?? "");
      return Number.isFinite(launchTime) && launchTime <= now;
    })
    .sort((left, right) => Date.parse(right.launch_time_utc ?? "") - Date.parse(left.launch_time_utc ?? ""));
  const visiblePastLaunches = new Set(pastLaunches.slice(0, safeLimit));

  return launches.filter((launch) => {
    const launchTime = Date.parse(launch.launch_time_utc ?? "");
    return !Number.isFinite(launchTime) || launchTime > now || visiblePastLaunches.has(launch);
  });
}
