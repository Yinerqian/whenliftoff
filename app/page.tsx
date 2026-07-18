import type { Metadata } from "next";
import { LaunchAutoRefresh } from "@/components/launch-auto-refresh";
import { HomePageView } from "@/components/home-page";
import { getHomeLaunchStatistics, getNextUpcomingLaunch } from "@/lib/launch-repository";
import { getLatestNews } from "@/lib/news-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "whenliftoff - 全球火箭发射时间与航天新闻",
  description: "查看下一次全球火箭发射倒计时、本年度发射统计和最新航天新闻。",
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

  const launch = launchResult.status === "fulfilled" ? launchResult.value : null;
  return <>
    <LaunchAutoRefresh launchTimes={[launch?.launch_time_utc]} />
    <HomePageView
      launch={launch}
      stats={statisticsResult.status === "fulfilled" ? statisticsResult.value : null}
      news={newsResult.status === "fulfilled" ? newsResult.value : null}
    />
  </>;
}
