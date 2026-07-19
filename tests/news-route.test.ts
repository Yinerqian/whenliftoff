import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const listNews = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news-repository", () => ({ listNews }));

import { GET } from "@/app/api/news/route";

describe("news API route", () => {
  beforeEach(() => {
    listNews.mockReset();
    listNews.mockResolvedValue({ items: [], nextCursor: null, lastSyncedAt: null });
  });

  it("forwards search and cursor parameters to the repository", async () => {
    const response = await GET(new NextRequest("http://localhost/api/news?q=%E6%9C%88%E7%90%83&cursor=next-page"));

    expect(response.status).toBe(200);
    expect(listNews).toHaveBeenCalledWith({ q: "月球", cursor: "next-page" });
  });

  it("keeps the default feed behavior without parameters", async () => {
    await GET(new NextRequest("http://localhost/api/news"));
    expect(listNews).toHaveBeenCalledWith({ q: undefined, cursor: undefined });
  });
});
