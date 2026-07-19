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

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ preview?: string; q?: string }> }) {
  const params = await searchParams;
  const initialSearch = params.q?.trim().slice(0, 100) ?? "";
  const preview = process.env.NODE_ENV === "development" && params.preview === "1";
  if (preview) return <NewsHome initial={previewNewsPage(undefined, initialSearch)} nextLaunch={previewLaunch} preview initialSearch={initialSearch} />;
  const [newsResult, launchResult] = await Promise.allSettled([listNews({ q: initialSearch || undefined }), getNextUpcomingLaunch()]);
  const initial = newsResult.status === "fulfilled" ? newsResult.value : { items: [], nextCursor: null, lastSyncedAt: null };
  const nextLaunch = launchResult.status === "fulfilled" ? launchResult.value : null;
  return <NewsHome initial={initial} nextLaunch={nextLaunch} initialError={newsResult.status === "rejected"} initialSearch={initialSearch} />;
}
