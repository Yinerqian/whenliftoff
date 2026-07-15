import { LaunchSchedule } from "@/components/launch-schedule";
import { searchLaunches } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const initial = await searchLaunches({ limit: 18 });
    return <LaunchSchedule initial={initial} />;
  } catch {
    return <LaunchSchedule initial={{ items: [], nextCursor: null, lastSyncedAt: null, providers: [] }} initialError />;
  }
}
