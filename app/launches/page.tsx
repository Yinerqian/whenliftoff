import { LaunchSchedule } from "@/components/launch-schedule";
import { searchLaunches } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

export default async function LaunchesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const initialSearch = params.q?.trim().slice(0, 100) ?? "";
  try {
    const initial = await searchLaunches({ limit: 18, currentMonth: true, q: initialSearch || undefined });
    return <LaunchSchedule initial={initial} initialSearch={initialSearch} />;
  } catch {
    return <LaunchSchedule initial={{ items: [], nextCursor: null, lastSyncedAt: null, providers: [], monthTotal: 0, providerCounts: [] }} initialError initialSearch={initialSearch} />;
  }
}
