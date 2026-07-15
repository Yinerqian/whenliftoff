"use client";

import { useState } from "react";
import { SiteHeader, type SiteSection } from "@/components/site-header";

export function PlaceholderPage({ active }: { active: Extract<SiteSection, "home" | "news"> }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <main className="app-shell placeholder-shell" data-theme={theme}>
      <SiteHeader
        active={active}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === "light" ? "dark" : "light")}
      />
      <div className="blank-page" aria-label={active === "home" ? "首页内容待补充" : "新闻内容待补充"} />
    </main>
  );
}
