import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkNewsBlocks, contentBlocksHash, translateNewsMetadataBatch } from "@/lib/news-translation";
import type { NewsContentBlock } from "@/lib/news-types";

describe("news translation chunks", () => {
  const originalApiKey = process.env.DEEPSEEK_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalApiKey;
  });
  const blocks: NewsContentBlock[] = [
    { id: "b1", type: "heading", text: "A".repeat(40) },
    { id: "b2", type: "paragraph", text: "B".repeat(70) },
    { id: "b3", type: "quote", text: "C".repeat(40) },
  ];

  it("keeps block order and respects chunk limits", () => {
    const chunks = chunkNewsBlocks(blocks, 100, 2);
    expect(chunks.flat().map((block) => block.id)).toEqual(["b1", "b2", "b3"]);
    expect(chunks).toHaveLength(3);
  });

  it("changes the content hash when upstream body changes", () => {
    expect(contentBlocksHash(blocks)).not.toBe(contentBlocksHash([{ ...blocks[0], text: "updated" }, ...blocks.slice(1)]));
  });

  it("keeps valid per-item metadata when DeepSeek omits another batch item", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: JSON.stringify({
        items: [{ key: "article:1", title_cn: "中文标题", summary_cn: "中文摘要" }],
      }) } }],
    })));

    const translated = await translateNewsMetadataBatch([
      { key: "article:1", title: "First", summary: "First summary" },
      { key: "article:2", title: "Second", summary: "Second summary" },
    ]);

    expect(translated.get("article:1")).toEqual({ title_cn: "中文标题", summary_cn: "中文摘要" });
    expect(translated.has("article:2")).toBe(false);
  });
});
