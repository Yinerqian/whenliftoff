export function formatBeijingTime(value: string | null) {
  if (!value) return "发射时间尚未确认";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatUtcTime(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", "") + " UTC";
}

export function formatBeijingClock(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatBeijingDate(value: string | null) {
  if (!value) return { day: "--", month: "日期待定" };
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    day: "2-digit",
  }).format(date);
  const month = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    weekday: "short",
  }).format(date);
  return { day, month };
}

export function countdownParts(value: string | null, now = Date.now()) {
  if (!value) return null;
  const remaining = new Date(value).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
