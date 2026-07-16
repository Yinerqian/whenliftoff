import { describe, expect, it } from "vitest";
import { chunkNewsBlocks, contentBlocksHash } from "@/lib/news-translation";
import type { NewsContentBlock } from "@/lib/news-types";

describe("news translation chunks", () => {
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
});

