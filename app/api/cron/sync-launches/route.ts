import { NextRequest, NextResponse } from "next/server";
import { parseLaunchSyncMode, syncLaunches } from "@/lib/sync-launches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestedMode = parseLaunchSyncMode(request.nextUrl.searchParams.get("mode"));
  if (!requestedMode) {
    return NextResponse.json({ error: "mode must be either full or hot." }, { status: 400 });
  }
  try {
    return NextResponse.json(await syncLaunches(requestedMode));
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
