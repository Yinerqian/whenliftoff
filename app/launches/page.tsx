import { LaunchSchedule } from "@/components/launch-schedule";
import { ALL_CURRENT_MONTH_LIMIT, LAUNCH_PAGE_LIMIT } from "@/lib/launch-pagination";
import { getRecentCompletedLaunches, searchLaunches } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

export default async function LaunchesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const initialSearch = params.q?.trim().slice(0, 100) ?? "";
  try {
    const [initial, recentCompleted] = await Promise.all([
      searchLaunches({
        limit: initialSearch ? LAUNCH_PAGE_LIMIT : ALL_CURRENT_MONTH_LIMIT,
        currentMonth: true,
        q: initialSearch || undefined,
      }),
      getRecentCompletedLaunches(3).catch(() => []),
    ]);
    return <LaunchSchedule initial={initial} recentCompleted={recentCompleted} initialSearch={initialSearch} />;
  } catch {
    return <LaunchSchedule initial={{ items: [], nextCursor: null, lastSyncedAt: null, providers: [], monthTotal: 0, providerCounts: [] }} recentCompleted={[]} initialError initialSearch={initialSearch} />;
  }
}
