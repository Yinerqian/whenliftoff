import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, maxDuration } from "@/app/api/cron/sync-news/route";

const originalSecret = process.env.CRON_SECRET;

describe("news synchronization route", () => {
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("uses the full five-minute Hobby function allowance", () => {
    expect(maxDuration).toBe(300);
  });

  it("rejects an unauthorized request", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new NextRequest("http://localhost/api/cron/sync-news"));

    expect(response.status).toBe(401);
  });
});
