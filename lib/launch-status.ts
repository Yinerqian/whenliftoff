export type LaunchStatusTone = "success" | "failed" | "pending" | "planned";

type LaunchStatusMeta = {
  label: string;
  tone: LaunchStatusTone;
};

const knownStatuses: Record<string, LaunchStatusMeta> = {
  go: { label: "计划发射", tone: "planned" },
  "go for launch": { label: "计划发射", tone: "planned" },
  tbd: { label: "时间待定", tone: "pending" },
  "to be determined": { label: "时间待定", tone: "pending" },
  tbc: { label: "时间待确认", tone: "pending" },
  "to be confirmed": { label: "时间待确认", tone: "pending" },
  hold: { label: "暂停", tone: "pending" },
  "on hold": { label: "暂停", tone: "pending" },
  "in flight": { label: "飞行中", tone: "planned" },
  "launch in flight": { label: "飞行中", tone: "planned" },
  deployed: { label: "载荷已部署", tone: "success" },
  "payload deployed": { label: "载荷已部署", tone: "success" },
  success: { label: "发射成功", tone: "success" },
  "launch successful": { label: "发射成功", tone: "success" },
  failure: { label: "发射失败", tone: "failed" },
  "launch failure": { label: "发射失败", tone: "failed" },
  "partial failure": { label: "部分失败", tone: "failed" },
  "launch was a partial failure": { label: "部分失败", tone: "failed" },
};

function normalize(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

export function getLaunchStatusMeta(status: string | null | undefined, fallback?: string | null): LaunchStatusMeta {
  return knownStatuses[normalize(status)]
    ?? knownStatuses[normalize(fallback)]
    ?? { label: fallback?.trim() || "状态待确认", tone: "pending" };
}
