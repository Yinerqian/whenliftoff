import { NextRequest, NextResponse } from "next/server";
import { getLaunchLiveSnapshot } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length > 100 || ids.some((id) => !UUID_PATTERN.test(id))) {
    return NextResponse.json({ error: "ids must contain at most 100 UUIDs." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getLaunchLiveSnapshot(ids));
  } catch {
    return NextResponse.json({ error: "发射状态暂时无法刷新，请稍后重试。" }, { status: 503 });
  }
}
