type ImageMetadata = {
  image_url?: string | null;
  thumbnail_url?: string | null;
};

export function resolveLaunchImageUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object") {
    const image = value as ImageMetadata;
    return image.image_url || image.thumbnail_url || null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return resolveLaunchImageUrl(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
