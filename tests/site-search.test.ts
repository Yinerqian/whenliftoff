import { describe, expect, it } from "vitest";
import { searchHref, searchSectionForPath } from "@/lib/site-search";

describe("site search routing", () => {
  it.each([
    ["/", "launches"],
    ["/launches", "launches"],
    ["/launches/falcon-9", "launches"],
    ["/news", "news"],
    ["/news/article/42", "news"],
  ] as const)("maps %s to %s search", (pathname, section) => {
    expect(searchSectionForPath(pathname)).toBe(section);
  });

  it("builds encoded destinations and clears an empty query", () => {
    expect(searchHref("launches", "长征 5B")).toBe("/launches?q=%E9%95%BF%E5%BE%81+5B");
    expect(searchHref("news", "月球")).toBe("/news?q=%E6%9C%88%E7%90%83");
    expect(searchHref("news", "")).toBe("/news");
  });
});
