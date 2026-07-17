import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsDetail } from "@/components/news-detail";
import { getLaunchById, getNextUpcomingLaunch } from "@/lib/launch-repository";
import { getNewsItem } from "@/lib/news-repository";
import { isNewsContentType } from "@/lib/news-types";
import { previewLaunch, previewNewsItem } from "@/lib/news-preview";

export const dynamic = "force-dynamic";

type NewsDetailPageProps = { params: Promise<{ type: string; id: string }>; searchParams?: Promise<{ preview?: string }> };

async function resolveItem(params: Promise<{ type: string; id: string }>) {
  const { type, id } = await params;
  const externalId = Number(id);
  if (!isNewsContentType(type) || !Number.isSafeInteger(externalId) || externalId < 0) return null;
  return getNewsItem(type, externalId).catch(() => null);
}

export async function generateMetadata({ params, searchParams }: NewsDetailPageProps): Promise<Metadata> {
  const route = await params;
  const preview = process.env.NODE_ENV === "development" && (await searchParams)?.preview === "1";
  const item = preview ? previewNewsItem(route.type, Number(route.id)) : await resolveItem(Promise.resolve(route));
  if (!item) return { title: "新闻未找到 · whenliftoff" };
  const title = item.title_cn || item.title;
  const description = item.summary_cn || item.summary || `来自 ${item.news_site} 的航天新闻中文阅读页。`;
  return {
    title: `${title} · 航天新闻 | whenliftoff`,
    description,
    openGraph: { title, description, type: "article", publishedTime: item.published_at, images: item.image_url ? [{ url: item.image_url }] : undefined },
  };
}

export default async function NewsDetailPage({ params, searchParams }: NewsDetailPageProps) {
  const route = await params;
  const preview = process.env.NODE_ENV === "development" && (await searchParams)?.preview === "1";
  const item = preview ? previewNewsItem(route.type, Number(route.id)) : await resolveItem(Promise.resolve(route));
  if (!item) notFound();
  if (preview) return <NewsDetail item={item} launch={previewLaunch} />;
  const relatedId = item.related_launch_ids?.[0];
  const related = relatedId ? await getLaunchById(relatedId).catch(() => null) : null;
  const fallback = related ? null : await getNextUpcomingLaunch().catch(() => null);
  return <NewsDetail item={item} launch={related || fallback} />;
}
