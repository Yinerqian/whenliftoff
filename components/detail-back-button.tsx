"use client";

import { useRouter } from "next/navigation";
import { prepareDetailScrollRestore } from "@/lib/detail-return-position";

export function DetailBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function returnToPreviousPage() {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const pending = prepareDetailScrollRestore(currentPath);

    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    router.push(pending?.sourcePath ?? fallbackHref);
  }

  return (
    <button className="detail-back-button" type="button" onClick={returnToPreviousPage} aria-label="返回上一页" title="返回上一页">
      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
