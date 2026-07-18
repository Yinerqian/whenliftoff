"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SiteHeader, type SiteSection } from "@/components/site-header";
import { isDetailDestination, rememberDetailReturnPosition, takePendingScrollRestore } from "@/lib/detail-return-position";

export const LAUNCH_SEARCH_EVENT = "whenliftoff:launch-search";

function sectionForPath(pathname: string): SiteSection {
  if (pathname.startsWith("/news")) return "news";
  if (pathname.startsWith("/launches")) return "launches";
  return "home";
}

function shellForPath(pathname: string) {
  if (pathname === "/") return "home-shell";
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

  useEffect(() => {
    if (document.documentElement.dataset.newsPointerNavigation !== "true") return;
    const timer = window.setTimeout(() => {
      delete document.documentElement.dataset.newsPointerNavigation;
    }, 320);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    function rememberPosition(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || !isDetailDestination(destination.pathname)) return;
      rememberDetailReturnPosition(`${destination.pathname}${destination.search}`);
    }

    document.addEventListener("click", rememberPosition, true);
    return () => document.removeEventListener("click", rememberPosition, true);
  }, []);

  useEffect(() => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const pending = takePendingScrollRestore(currentPath);
    if (!pending) return;
    const savedScrollY = pending.scrollY;

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    let frame = 0;
    let attempts = 0;
    let stableFrames = 0;
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frame);
      root.style.scrollBehavior = previousScrollBehavior;
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchstart", finish);
      window.removeEventListener("pointerdown", finish);
      window.removeEventListener("keydown", finish);
    }

    function restorePosition() {
      if (finished) return;
      const pageIsBusy = Boolean(document.querySelector('[aria-busy="true"]'));
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = Math.min(savedScrollY, maxScroll);

      if (!pageIsBusy) {
        window.scrollTo({ top: target, left: 0, behavior: "auto" });
        const reachedTarget = Math.abs(window.scrollY - target) <= 2;
        const fullPositionAvailable = maxScroll >= savedScrollY - 2;
        stableFrames = reachedTarget && (fullPositionAvailable || attempts > 120) ? stableFrames + 1 : 0;
        if (stableFrames >= 18) {
          finish();
          return;
        }
      } else {
        stableFrames = 0;
      }

      attempts += 1;
      if (attempts >= 180) {
        finish();
        return;
      }
      frame = window.requestAnimationFrame(restorePosition);
    }

    window.addEventListener("wheel", finish, { passive: true });
    window.addEventListener("touchstart", finish, { passive: true });
    window.addEventListener("pointerdown", finish, { passive: true });
    window.addEventListener("keydown", finish);
    frame = window.requestAnimationFrame(restorePosition);
    return finish;
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
