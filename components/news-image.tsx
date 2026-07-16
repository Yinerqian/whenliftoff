"use client";

import type { ImgHTMLAttributes } from "react";

const FALLBACK_IMAGE = "/assets/whenliftoff/detail_rocket.jpg";

export function NewsImage({ src, alt, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null }) {
  return (
    // Upstream hosts are not known at build time; a plain img also lets us fail over without a remote-image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src || FALLBACK_IMAGE}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.dataset.fallback === "true") return;
        event.currentTarget.dataset.fallback = "true";
        event.currentTarget.src = FALLBACK_IMAGE;
      }}
    />
  );
}

