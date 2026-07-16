import type { Metadata } from "next";
import { NewsHome } from "@/components/news-home";
import { getNextUpcomingLaunch } from "@/lib/launch-repository";
import { listNews } from "@/lib/news-repository";
import { previewLaunch, previewNewsPage } from "@/lib/news-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "航天新闻 · whenliftoff",
  description: "聚合最新航天新闻、机构博客与行业报告，并提供中文阅读体验。",
  openGraph: { title: "航天新闻 · whenliftoff", description: "探索太空，发现未来。" },
};

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const preview = process.env.NODE_ENV === "development" && (await searchParams).preview === "1";
  if (preview) return <NewsHome initial={previewNewsPage()} nextLaunch={previewLaunch} preview />;
  const [newsResult, launchResult] = await Promise.allSettled([listNews(), getNextUpcomingLaunch()]);
  const initial = newsResult.status === "fulfilled" ? newsResult.value : { items: [], nextCursor: null, lastSyncedAt: null };
  const nextLaunch = launchResult.status === "fulfilled" ? launchResult.value : null;
  return <NewsHome initial={initial} nextLaunch={nextLaunch} initialError={newsResult.status === "rejected"} />;
}
