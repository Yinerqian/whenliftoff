export type LaunchPageScope = "month" | "future";

export type LaunchPageRequest = {
  scope: LaunchPageScope;
  cursor?: string;
};

export function nextLaunchPage(cursor: string | null, scope: LaunchPageScope): LaunchPageRequest | null {
  if (cursor) return { scope, cursor };
  if (scope === "month") return { scope: "future" };
  return null;
}
