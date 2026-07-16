import { createHash } from "node:crypto";
import type { NewsContentBlock } from "@/lib/news-types";

export type NewsMetadataTranslation = { title_cn: string; summary_cn: string | null };
export type NewsMetadataInput = { key: string; title: string; summary: string | null };

export function contentBlocksHash(blocks: NewsContentBlock[]) {
  return createHash("sha256").update(JSON.stringify(blocks.map(({ type, text }) => ({ type, text })))).digest("hex");
}

export function chunkNewsBlocks(blocks: NewsContentBlock[], maxCharacters = 5_500, maxBlocks = 10) {
  const chunks: NewsContentBlock[][] = [];
  let current: NewsContentBlock[] = [];
  let size = 0;
  for (const block of blocks) {
    if (current.length && (current.length >= maxBlocks || size + block.text.length > maxCharacters)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += block.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function parseJson(content: string) {
  return JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

async function deepSeekJson(messages: Array<{ role: "system" | "user"; content: string }>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY must be configured for translations.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages,
      }),
    });
    if (!response.ok) throw new Error(`DeepSeek request failed (${response.status}).`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no translation content.");
    return parseJson(content) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateNewsMetadata(title: string, summary: string | null): Promise<NewsMetadataTranslation> {
  const value = await deepSeekJson([
    {
      role: "system",
      content: "将航天新闻标题和摘要忠实翻译为简体中文。保留机构、任务、火箭、航天器、型号和缩写，不补充或猜测事实。仅返回 JSON：title_cn、summary_cn；没有摘要时 summary_cn 为 null。",
    },
    { role: "user", content: JSON.stringify({ title, summary }) },
  ]);
  if (typeof value.title_cn !== "string" || !value.title_cn.trim()) throw new Error("DeepSeek returned an invalid news title.");
  return {
    title_cn: value.title_cn.trim(),
    summary_cn: typeof value.summary_cn === "string" && value.summary_cn.trim() ? value.summary_cn.trim() : null,
  };
}

export async function translateNewsMetadataBatch(items: NewsMetadataInput[]) {
  if (!items.length) return new Map<string, NewsMetadataTranslation>();
  const value = await deepSeekJson([
    {
      role: "system",
      content: "将一组航天新闻标题和摘要忠实翻译为简体中文。保留每项 key，保留机构、任务、火箭、航天器、型号和缩写，不补充或猜测事实。仅返回 JSON：{\"items\":[{\"key\",\"title_cn\",\"summary_cn\"}]}；没有摘要时 summary_cn 为 null。",
    },
    { role: "user", content: JSON.stringify({ items }) },
  ]);
  if (!Array.isArray(value.items)) throw new Error("DeepSeek returned invalid metadata translations.");
  const result = new Map<string, NewsMetadataTranslation>();
  for (const item of value.items as Array<Record<string, unknown>>) {
    if (typeof item.key !== "string" || typeof item.title_cn !== "string" || !item.title_cn.trim()) continue;
    result.set(item.key, {
      title_cn: item.title_cn.trim(),
      summary_cn: typeof item.summary_cn === "string" && item.summary_cn.trim() ? item.summary_cn.trim() : null,
    });
  }
  if (result.size !== items.length) throw new Error("DeepSeek omitted one or more metadata translations.");
  return result;
}

export async function translateNewsBlocks(blocks: NewsContentBlock[]): Promise<NewsContentBlock[]> {
  const value = await deepSeekJson([
    {
      role: "system",
      content: "将航天新闻正文逐块忠实翻译为简体中文。不得省略、总结、扩写或添加事实；保留专有名词、数字、单位与原块 id/type。仅返回 JSON：{\"blocks\":[{\"id\",\"type\",\"text\"}]}。",
    },
    { role: "user", content: JSON.stringify({ blocks }) },
  ]);
  if (!Array.isArray(value.blocks) || value.blocks.length !== blocks.length) throw new Error("DeepSeek returned an invalid block translation.");
  const translatedBlocks = value.blocks as Array<Record<string, unknown>>;
  return blocks.map((source, index) => {
    const translated = translatedBlocks[index];
    if (translated?.id !== source.id || typeof translated.text !== "string" || !translated.text.trim()) {
      throw new Error("DeepSeek changed a block identifier or returned empty text.");
    }
    return { id: source.id, type: source.type, text: translated.text.trim() };
  });
}
