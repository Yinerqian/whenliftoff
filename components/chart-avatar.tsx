"use client";

import { useState } from "react";

export function ChartAvatar({ src, fallback, imageClassName }: { src: string | null; fallback: string; imageClassName?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="home-chart-avatar-fallback" aria-hidden="true">{fallback}</span>;
  }

  return (
    // Avatar sources come from LL2 and the ISO flag CDN, so they cannot use a fixed Next.js remote allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={imageClassName} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}
