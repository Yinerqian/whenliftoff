import { beforeEach, describe, expect, it, vi } from "vitest";

const eqCalls = vi.hoisted(() => [] as Array<[string, string, unknown]>);

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      const result = table === "sync_runs" ? { data: null, error: null } : { data: [], error: null };
      const query: Record<string, unknown> & PromiseLike<typeof result> = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          eqCalls.push([table, column, value]);
          return query;
        },
        or: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    },
  }),
}));

import { getLatestNews, getNewsItem, listNews } from "@/lib/news-repository";

describe("news Chinese publication gate", () => {
  beforeEach(() => eqCalls.splice(0));

  it("filters the public list to metadata-complete rows", async () => {
    await listNews();
    expect(eqCalls).toContainEqual(["news_items", "metadata_translation_status", "complete"]);
  });

  it("filters the homepage feature to metadata-complete rows", async () => {
    await getLatestNews();
    expect(eqCalls).toContainEqual(["news_items", "metadata_translation_status", "complete"]);
  });

  it("hides a direct detail lookup until metadata is complete", async () => {
    await getNewsItem("article", 987654321);
    expect(eqCalls).toContainEqual(["news_items", "metadata_translation_status", "complete"]);
  });
});
