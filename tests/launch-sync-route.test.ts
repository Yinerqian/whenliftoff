import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/sync-launches/route";

const originalSecret = process.env.CRON_SECRET;

describe("launch synchronization route", () => {
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rejects an unauthorized request", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new NextRequest("http://localhost/api/cron/sync-launches?mode=hot"));

    expect(response.status).toBe(401);
  });

  it("rejects an unsupported synchronization mode before doing work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new NextRequest("http://localhost/api/cron/sync-launches?mode=weekly", {
      headers: { Authorization: "Bearer test-secret" },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "mode must be either full or hot." });
  });
});
