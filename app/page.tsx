import type { Metadata } from "next";
import { HomePageView } from "@/components/home-page";
import { getHomeLaunchStatistics, getNextUpcomingLaunch } from "@/lib/launch-repository";
import { getLatestNews } from "@/lib/news-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "whenliftoff - 全球火箭发射时间与航天新闻",
  description: "查看下一次全球火箭发射倒计时、过去十二个月发射统计和最新航天新闻。",
  openGraph: {
    title: "whenliftoff - 全球火箭发射时间与航天新闻",
    description: "全球火箭发射动态、数据统计与航天新闻的中文化展示。",
  },
};

export default async function HomePage() {
  const [launchResult, statisticsResult, newsResult] = await Promise.allSettled([
    getNextUpcomingLaunch(),
    getHomeLaunchStatistics(),
    getLatestNews(),
  ]);

  return (
    <HomePageView
      launch={launchResult.status === "fulfilled" ? launchResult.value : null}
      stats={statisticsResult.status === "fulfilled" ? statisticsResult.value : null}
      news={newsResult.status === "fulfilled" ? newsResult.value : null}
    />
  );
}
