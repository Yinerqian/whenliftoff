const HOT_PAST_MS = 48 * 60 * 60 * 1000;
const HOT_FUTURE_MS = 6 * 60 * 60 * 1000;

export function hasLaunchInRefreshWindow(
  launchTimes: Array<string | null | undefined>,
  now = Date.now(),
) {
  return launchTimes.some((value) => {
    const launchTime = Date.parse(value ?? "");
    return Number.isFinite(launchTime)
      && launchTime >= now - HOT_PAST_MS
      && launchTime <= now + HOT_FUTURE_MS;
  });
}
