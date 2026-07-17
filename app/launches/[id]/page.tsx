import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LaunchDetail } from "@/components/launch-detail";
import { getLaunchById } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

type DetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

function newsReturnPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  if (value === "/news") return value;
  return /^\/news\/(article|blog|report)\/\d+$/.test(value) ? value : null;
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const launch = await getLaunchById(id);
    if (!launch) return { title: "任务未找到 · whenliftoff" };
    return {
      title: `${launch.name_cn || launch.name} · 发射任务 | whenliftoff`,
      description: launch.mission_description_cn || launch.mission_description || `${launch.rocket_name || "运载火箭"}发射任务详情。`,
    };
  } catch {
    return { title: "发射任务 · whenliftoff" };
  }
}

export default async function LaunchDetailPage({ params, searchParams }: DetailPageProps) {
  const { id } = await params;
  const returnPath = newsReturnPath((await searchParams).from);
  const launch = await getLaunchById(id).catch(() => null);
  if (!launch) notFound();
  return <LaunchDetail launch={launch} newsReturnPath={returnPath} />;
}
