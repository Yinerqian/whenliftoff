"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SiteHeader, type SiteSection } from "@/components/site-header";

export const LAUNCH_SEARCH_EVENT = "whenliftoff:launch-search";

function sectionForPath(pathname: string): SiteSection {
  if (pathname.startsWith("/news")) return "news";
  if (pathname.startsWith("/launches")) return "launches";
  return "home";
}

function shellForPath(pathname: string) {
  if (pathname.startsWith("/launches/")) return "detail-shell";
  if (pathname.startsWith("/news/")) return "news-detail-shell";
  if (pathname === "/news") return "news-shell";
  return "";
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (pathname !== "/launches") {
      setSearchValue("");
      return;
    }
    setSearchValue(new URLSearchParams(window.location.search).get("q") ?? "");
  }, [pathname]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim().slice(0, 100);
    if (pathname === "/launches") {
      window.dispatchEvent(new CustomEvent(LAUNCH_SEARCH_EVENT, { detail: query }));
      return;
    }
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/launches${params.size ? `?${params.toString()}` : ""}`);
  }

  const routeShell = shellForPath(pathname);
  return (
    <div className={`app-shell site-frame${routeShell ? ` ${routeShell}` : ""}`} data-theme={theme}>
      <SiteHeader
        active={sectionForPath(pathname)}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === "light" ? "dark" : "light")}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={submitSearch}
      />
      {children}
    </div>
  );
}
