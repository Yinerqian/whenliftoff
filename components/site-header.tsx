"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEventHandler, MouseEvent } from "react";

export type SiteSection = "home" | "launches" | "news";

type SiteHeaderProps = {
  active: SiteSection;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  onSearchSubmit?: FormEventHandler<HTMLFormElement>;
  searchAction?: string;
  searchName?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
};

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({
  active,
  theme,
  onThemeToggle,
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  searchAction = "/launches",
  searchName = "q",
  searchPlaceholder = "搜索火箭、任务、机构…",
  searchLabel = "搜索火箭、任务或机构",
}: SiteHeaderProps) {
  function handleScheduleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/launches") return;

    event.preventDefault();
    window.history.replaceState(null, "", "/launches");
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0 });
    root.style.scrollBehavior = previousScrollBehavior;
  }

  const controlledSearch = searchValue !== undefined;

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="When Liftoff 首页">
        <Image className="brand-mark" src="/assets/whenliftoff/brand-mark.png" alt="" width={40} height={40} priority />
        <span className="brand-wordmark">when<b className="brand-liftoff">liftoff</b></span>
      </Link>
      <nav className="primary-nav" aria-label="主导航">
        <Link className={active === "home" ? "active" : undefined} href="/">首页</Link>
        <Link className={active === "launches" ? "active" : undefined} href="/launches" onClick={handleScheduleClick}>发射日程</Link>
        <Link className={active === "news" ? "active" : undefined} href="/news">新闻</Link>
      </nav>
      <form className="top-search" action={searchAction} method="get" onSubmit={onSearchSubmit}>
        <SearchIcon />
        <input
          name={searchName}
          value={controlledSearch ? searchValue : undefined}
          onChange={controlledSearch ? (event) => onSearchValueChange?.(event.target.value) : undefined}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
        />
      </form>
      <button
        className="theme-toggle"
        type="button"
        onClick={onThemeToggle}
        aria-label={theme === "light" ? "切换到夜间主题" : "切换到白天主题"}
      >
        ◐
      </button>
    </header>
  );
}
