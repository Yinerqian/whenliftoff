import { NextRequest, NextResponse } from "next/server";
import { listNews } from "@/lib/news-repository";
import { previewNewsPage } from "@/lib/news-preview";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  try {
    if (process.env.NODE_ENV === "development" && request.nextUrl.searchParams.get("preview") === "1") {
      return NextResponse.json(previewNewsPage(cursor, q));
    }
    return NextResponse.json(await listNews({ cursor, q }));
  } catch {
    return NextResponse.json({ error: "航天新闻暂时不可用，请稍后重试。" }, { status: 503 });
  }
}
