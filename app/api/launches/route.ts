import { NextRequest, NextResponse } from "next/server";
import { ALL_CURRENT_MONTH_LIMIT, FILTERED_LAUNCH_API_LIMIT } from "@/lib/launch-pagination";
import { searchLaunches } from "@/lib/launch-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Number(params.get("limit") ?? "9");
  const isUnfilteredCurrentMonth = params.get("month") === "current"
    && !params.get("q")
    && !params.get("provider")
    && !params.get("cursor");
  const maxLimit = isUnfilteredCurrentMonth ? ALL_CURRENT_MONTH_LIMIT : FILTERED_LAUNCH_API_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return NextResponse.json({ error: `limit must be an integer between 1 and ${maxLimit}.` }, { status: 400 });
  }
  try {
    const result = await searchLaunches({
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      provider: params.get("provider") ?? undefined,
      country: params.get("country") ?? undefined,
      currentMonth: params.get("month") === "current",
      futureAfterCurrentMonth: params.get("scope") === "future",
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "发射日程暂时不可用，请稍后重试。" }, { status: 503 });
  }
}
