import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { NewsBlockType, NewsContentBlock } from "@/lib/news-types";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) ||
    (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

function isBlockedIp(address: string) {
  if (isIP(address) === 4) return isBlockedIpv4(address);
  const value = address.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") ||
    value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") ||
    value.startsWith("::ffff:") && isBlockedIpv4(value.slice(7));
}

export async function assertPublicHttpUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP(S) article URLs are allowed.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private article hosts are not allowed.");
  }
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Private article hosts are not allowed.");
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
      throw new Error("Article host resolved to a private address.");
    }
  }
  url.hash = "";
  return url;
}

function blockType(tagName: string): NewsBlockType {
  if (/^H[1-3]$/.test(tagName)) return "heading";
  if (tagName === "LI") return "list_item";
  if (tagName === "BLOCKQUOTE") return "quote";
  return "paragraph";
}

export function extractBlocksFromHtml(html: string, url = "https://example.com/article") {
  const dom = new JSDOM(html, { url });
  dom.window.document.querySelectorAll([
    "script", "style", "noscript", "nav", "footer", "form", "iframe",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    "[class*='advert']", "[id*='advert']", "[class~='ad']", "[id~='ad']",
    "[class*='promo']", "[id*='promo']", "[class*='newsletter']", "[id*='newsletter']",
    "[class*='subscribe']", "[id*='subscribe']", "[class*='social-share']", "[id*='social-share']",
  ].join(",")).forEach((element) => element.remove());
  const article = new Readability(dom.window.document, { charThreshold: 80 }).parse();
  if (!article?.content) throw new Error("Unable to identify the article body.");
  const body = new JSDOM(article.content, { url }).window.document.body;
  const blocks: NewsContentBlock[] = [];
  const seen = new Set<string>();
  for (const element of body.querySelectorAll("h1,h2,h3,p,li,blockquote")) {
    if (element.tagName === "P" && element.closest("blockquote,li")) continue;
    if (element.tagName === "LI" && element.parentElement?.closest("li")) continue;
    const text = element.textContent?.replace(/\s+/g, " ").trim().slice(0, 6000) ?? "";
    if (text.length < 2 || seen.has(text)) continue;
    seen.add(text);
    blocks.push({ id: `b${blocks.length + 1}`, type: blockType(element.tagName), text });
    if (blocks.length >= 240) break;
  }
  if (!blocks.length || blocks.reduce((sum, block) => sum + block.text.length, 0) < 80) {
    throw new Error("Extracted article body is too short.");
  }
  return blocks;
}

async function fetchHtml(url: URL, signal: AbortSignal, redirectCount = 0): Promise<{ html: string; url: string }> {
  const response = await fetch(url, {
    signal,
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "whenliftoff-news-reader/1.0" },
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectCount >= MAX_REDIRECTS) throw new Error("Article redirected too many times.");
    const location = response.headers.get("location");
    if (!location) throw new Error("Article redirect has no destination.");
    return fetchHtml(await assertPublicHttpUrl(new URL(location, url).toString()), signal, redirectCount + 1);
  }
  if (!response.ok) throw new Error(`Article request failed (${response.status}).`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("Article response is not HTML.");
  }
  const declaredSize = Number(response.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_BYTES) throw new Error("Article response is too large.");
  if (!response.body) throw new Error("Article response has no body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error("Article response is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { html: new TextDecoder().decode(bytes), url: url.toString() };
}

export async function extractArticle(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchHtml(await assertPublicHttpUrl(url), controller.signal);
    return extractBlocksFromHtml(response.html, response.url);
  } finally {
    clearTimeout(timeout);
  }
}
