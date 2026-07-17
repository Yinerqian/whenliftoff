import type { SiteSection } from "@/components/site-header";

export function PlaceholderPage({ active }: { active: Extract<SiteSection, "home" | "news"> }) {
  return (
    <main className="placeholder-route-main">
      <div className="blank-page" aria-label={active === "home" ? "首页内容待补充" : "新闻内容待补充"} />
    </main>
  );
}
