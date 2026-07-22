import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, extractBlocksFromHtml, isBlockedIpv4 } from "@/lib/news-extraction";

describe("news article extraction", () => {
  it("allows NASA's public 192.0.66.108 address without weakening private-address blocking", async () => {
    expect(isBlockedIpv4("192.0.66.108")).toBe(false);
    expect(isBlockedIpv4("192.0.0.1")).toBe(true);
    expect(isBlockedIpv4("192.168.1.1")).toBe(true);
    expect(isBlockedIpv4("10.0.0.1")).toBe(true);
    expect(isBlockedIpv4("127.0.0.1")).toBe(true);
    expect(isBlockedIpv4("999.0.0.1")).toBe(true);
    await expect(assertPublicHttpUrl("https://192.0.66.108/nasa-article")).resolves.toMatchObject({
      hostname: "192.0.66.108",
    });
  });

  it("keeps semantic text blocks and drops navigation, scripts and ads", () => {
    const html = `<!doctype html><html><body>
      <nav>Subscription Home Login</nav><script>window.evil = true</script>
      <article><h1>Lunar mission reaches orbit</h1>
      <p>The spacecraft successfully entered lunar orbit after completing a carefully planned engine burn lasting several minutes.</p>
      <div class="advertisement">BUY THIS UNRELATED PRODUCT</div>
      <h2>Mission milestones</h2><ul><li>Launch completed on schedule</li><li>Communications remain stable</li></ul>
      <blockquote>The vehicle is operating normally, according to the mission team.</blockquote>
      <p>Controllers will spend the next several days checking every major spacecraft system before science operations begin.</p></article>
      <footer>Privacy Terms Contact</footer></body></html>`;
    const blocks = extractBlocksFromHtml(html);
    expect(blocks.map((block) => block.type)).toEqual(expect.arrayContaining(["heading", "paragraph", "list_item", "quote"]));
    const text = blocks.map((block) => block.text).join(" ");
    expect(text).toContain("Lunar mission reaches orbit");
    expect(text).not.toContain("window.evil");
    expect(text).not.toContain("BUY THIS");
    expect(text).not.toContain("Subscription Home Login");
  });
});
