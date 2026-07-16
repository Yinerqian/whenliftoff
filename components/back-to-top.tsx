"use client";

import { useEffect, useState } from "react";

const VISIBILITY_THRESHOLD = 480;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > VISIBILITY_THRESHOLD);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className={`back-to-top${visible ? " is-visible" : ""}`}
      aria-label="返回页面顶部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      title="返回顶部"
      onClick={scrollToTop}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6.5 11 5.5-5.5 5.5 5.5" />
        <path d="M12 6v12.5" />
      </svg>
    </button>
  );
}
