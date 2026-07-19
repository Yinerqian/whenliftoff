import { describe, expect, it } from "vitest";
import { filterNewsItems, normalizeNewsSearch } from "@/lib/news-repository";
import { previewNewsItems, previewNewsPage } from "@/lib/news-preview";

describe("news search", () => {
  it("normalizes PostgREST control characters and limits the query", () => {
    const normalized = normalizeNewsSearch(`  火箭,(NASA).:\"\\${"x".repeat(120)}  `);
    expect(normalized).not.toMatch(/[,%().:"\\]/);
    expect(normalized.length).toBeLessThanOrEqual(100);
    expect(normalized).toContain("火箭 NASA");
  });

  it("matches original and translated titles or summaries", () => {
    const chineseMatches = filterNewsItems(previewNewsItems, "NASA");
    const englishMatches = filterNewsItems(previewNewsItems, "Preview spaceflight story 4");
    const summaryMatches = filterNewsItems(previewNewsItems, "任务团队确认");

    expect(chineseMatches.length).toBeGreaterThan(0);
    expect(englishMatches.map((item) => item.external_id)).toContain(4);
    expect(summaryMatches.length).toBeGreaterThan(0);
  });

  it("filters preview data before applying pagination", () => {
    const page = previewNewsPage(undefined, "NASA");
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((item) => [item.title, item.title_cn, item.summary, item.summary_cn]
      .some((value) => value?.toLocaleLowerCase().includes("nasa")))).toBe(true);
  });
});
