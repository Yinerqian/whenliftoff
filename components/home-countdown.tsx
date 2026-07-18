"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/time";

export function HomeCountdown({ value }: { value: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = now === null ? null : countdownParts(value, now);
  if (now !== null && !parts) {
    return (
      <div className="home-countdown home-countdown-empty">
        <span>倒计时（北京时间）</span>
        <strong>{value ? "发射窗口已开启" : "发射时间待确认"}</strong>
      </div>
    );
  }

  return (
    <div className="home-countdown" aria-label="下一次发射倒计时">
      <span>倒计时（北京时间）</span>
      <div className="home-countdown-grid">
        {([
          [parts?.days, "天"],
          [parts?.hours, "时"],
          [parts?.minutes, "分"],
          [parts?.seconds, "秒"],
        ] as const).map(([number, label]) => (
          <div key={label}>
            <strong>{number === undefined ? "--" : String(number).padStart(2, "0")}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
