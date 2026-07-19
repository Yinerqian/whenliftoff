import { getLaunchStatusMeta } from "@/lib/launch-status";

const providerNames: Record<string, string> = {
  SpaceX: "太空探索技术公司",
  NASA: "美国国家航空航天局",
  ESA: "欧洲航天局",
  "Rocket Lab": "火箭实验室",
  "Blue Origin": "蓝色起源",
  Roscosmos: "俄罗斯国家航天集团",
  CNSA: "中国国家航天局",
};

const launchTermRules: Array<[RegExp, string]> = [
  [/\bFalcon Heavy\b/gi, "猎鹰重型"],
  [/\bFalcon 9\b/gi, "猎鹰9号"],
  [/\bStarlink Group\b/gi, "星链组"],
  [/\bStarlink\b/gi, "星链"],
];

function localizeKnownLaunchTerms(value: string) {
  return launchTermRules
    .reduce((localized, [pattern, replacement]) => localized.replace(pattern, replacement), value)
    .replace(/星链组\s+(?=\d)/g, "星链组");
}

export function localizeProvider(provider: string | null | undefined) {
  return provider ? providerNames[provider] ?? null : null;
}

export function localizeLaunchName(nameCn: string | null | undefined, sourceName: string) {
  return localizeKnownLaunchTerms(nameCn?.trim() || sourceName);
}

export function localizeRocketName(rocketName: string | null | undefined) {
  return rocketName ? localizeKnownLaunchTerms(rocketName) : null;
}

export function localizeStatus(abbrev: string | null | undefined, name: string | null | undefined) {
  const status = abbrev?.trim() || name?.trim() || "TBD";
  return { status, status_cn: getLaunchStatusMeta(status, name).label };
}
