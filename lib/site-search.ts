export type SiteSearchSection = "launches" | "news";

export const LAUNCH_SEARCH_EVENT = "whenliftoff:launch-search";
export const NEWS_SEARCH_EVENT = "whenliftoff:news-search";

export function searchSectionForPath(pathname: string): SiteSearchSection {
  return pathname.startsWith("/news") ? "news" : "launches";
}

export function searchHref(section: SiteSearchSection, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  return `/${section}${params.size ? `?${params.toString()}` : ""}`;
}
