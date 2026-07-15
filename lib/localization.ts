const providerNames: Record<string, string> = {
  SpaceX: "太空探索技术公司",
  NASA: "美国国家航空航天局",
  ESA: "欧洲航天局",
  "Rocket Lab": "火箭实验室",
  "Blue Origin": "蓝色起源",
  Roscosmos: "俄罗斯国家航天集团",
  CNSA: "中国国家航天局",
};

const statusNames: Record<string, string> = {
  Go: "计划发射",
  TBD: "时间待定",
  TBC: "时间待确认",
  Success: "发射成功",
  Failure: "发射失败",
  "Partial Failure": "部分失败",
  Hold: "暂停",
  "In Flight": "飞行中",
};

export function localizeProvider(provider: string | null | undefined) {
  return provider ? providerNames[provider] ?? null : null;
}

export function localizeStatus(abbrev: string | null | undefined, name: string | null | undefined) {
  const status = abbrev?.trim() || name?.trim() || "TBD";
  return { status, status_cn: statusNames[status] ?? name ?? "状态待确认" };
}
