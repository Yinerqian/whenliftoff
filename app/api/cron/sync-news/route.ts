import { NextRequest, NextResponse } from "next/server";
import { syncNews } from "@/lib/sync-news";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncNews());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "News sync failed" }, { status: 500 });
  }
}

