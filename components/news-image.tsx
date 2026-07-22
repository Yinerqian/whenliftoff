"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { getNewsImageTraits, type NewsImageTraits } from "@/lib/image";

const FALLBACK_IMAGE = "/assets/whenliftoff/detail_rocket.jpg";

export function NewsImage({ src, alt, className, onLoad, onError, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null }) {
  const source = src || FALLBACK_IMAGE;
  const [measurement, setMeasurement] = useState<{ source: string; traits: NewsImageTraits } | null>(null);
  const traits = measurement?.source === source ? measurement.traits : null;
  const adaptiveClassName = [
    className,
    "news-image-adaptive",
    traits?.isExtremeRatio ? "is-extreme-ratio" : "",
    traits?.isLowResolution ? "is-low-resolution" : "",
  ].filter(Boolean).join(" ");

  return (
    // Upstream hosts are not known at build time; a plain img also lets us fail over without a remote-image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      className={adaptiveClassName}
      src={source}
      alt={alt}
      data-image-presentation={traits?.isLowResolution ? "low-resolution" : traits?.isExtremeRatio ? "extreme-ratio" : "standard"}
      onLoad={(event) => {
        setMeasurement({
          source,
          traits: getNewsImageTraits(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight),
        });
        onLoad?.(event);
      }}
      onError={(event) => {
        onError?.(event);
        if (event.currentTarget.dataset.fallback === "true") return;
        event.currentTarget.dataset.fallback = "true";
        event.currentTarget.src = FALLBACK_IMAGE;
      }}
    />
  );
}
