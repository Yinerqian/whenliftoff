import type { NewsListItem } from "@/lib/news-types";

export type NewsCardVariant = "portrait" | "landscape" | "square" | "compact" | "highlight";
export type NewsColumnCard = { item: NewsListItem; variant: NewsCardVariant; index: number };

const VARIANT_SEQUENCE: NewsCardVariant[] = [
  "portrait", "landscape", "landscape", "highlight", "square", "compact", "landscape", "portrait", "compact",
  "square", "highlight", "landscape", "compact", "portrait", "landscape", "square", "compact", "highlight",
  "landscape", "portrait", "compact", "square", "landscape", "highlight", "compact", "portrait", "landscape", "square", "compact",
];

const VARIANT_WEIGHT: Record<NewsCardVariant, number> = {
  portrait: 1.75,
  landscape: 1.08,
  square: 1.36,
  compact: 0.82,
  highlight: 1.12,
};

function newsCardWeight(item: NewsListItem, variant: NewsCardVariant) {
  const gainsImage = Boolean(item.image_url?.trim()) && (variant === "compact" || variant === "highlight");
  return VARIANT_WEIGHT[variant] + (gainsImage ? 0.55 : 0);
}

export function newsCardVariant(index: number) {
  return VARIANT_SEQUENCE[index % VARIANT_SEQUENCE.length];
}

export function distributeNewsColumns(items: NewsListItem[], columnCount: number) {
  const count = Math.min(Math.max(Math.floor(columnCount), 1), 3);
  if (count === 1) return [items.map((item, index) => ({ item, index, variant: newsCardVariant(index) }))];
  const columns: NewsColumnCard[][] = Array.from({ length: count }, () => []);
  const heights = Array.from({ length: count }, () => 0);
  items.forEach((item, index) => {
    const variant = newsCardVariant(index);
    const target = heights.indexOf(Math.min(...heights));
    columns[target].push({ item, variant, index });
    heights[target] += newsCardWeight(item, variant);
  });
  return columns;
}

export function appendNewsColumns(existing: NewsColumnCard[][], items: NewsListItem[]) {
  const columns = existing.map((column) => [...column]);
  const heights = columns.map((column) => column.reduce((sum, card) => sum + newsCardWeight(card.item, card.variant), 0));
  const startIndex = columns.reduce((sum, column) => sum + column.length, 0);
  items.forEach((item, offset) => {
    const index = startIndex + offset;
    const variant = newsCardVariant(index);
    const target = heights.indexOf(Math.min(...heights));
    columns[target].push({ item, variant, index });
    heights[target] += newsCardWeight(item, variant);
  });
  return columns;
}
