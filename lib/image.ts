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

export type NewsImageTraits = {
  isExtremeRatio: boolean;
  isLowResolution: boolean;
};

export function getNewsImageTraits(width: number, height: number): NewsImageTraits {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { isExtremeRatio: false, isLowResolution: false };
  }

  const ratio = width / height;
  return {
    isExtremeRatio: ratio > 2.2 || ratio < 0.72,
    isLowResolution: width < 480 || height < 270 || width * height < 160_000,
  };
}
