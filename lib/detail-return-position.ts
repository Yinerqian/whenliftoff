export type DetailReturnPosition = {
  sourcePath: string;
  targetPath: string;
  scrollY: number;
  savedAt: number;
};

export type PendingScrollRestore = Pick<DetailReturnPosition, "sourcePath" | "scrollY" | "savedAt">;

const RETURN_POSITION_KEY = "whenliftoff:detail-return-position";
const PENDING_RESTORE_KEY = "whenliftoff:pending-scroll-restore";
const MAX_POSITION_AGE_MS = 4 * 60 * 60 * 1000;

export function isDetailDestination(pathname: string) {
  return /^\/launches\/[^/]+$/.test(pathname) || /^\/news\/(article|blog|report)\/[^/]+$/.test(pathname);
}

function readSessionValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

function removeSessionValue(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function rememberDetailReturnPosition(targetPath: string) {
  writeSessionValue(RETURN_POSITION_KEY, {
    sourcePath: `${window.location.pathname}${window.location.search}`,
    targetPath,
    scrollY: Math.max(0, window.scrollY),
    savedAt: Date.now(),
  } satisfies DetailReturnPosition);
}

export function prepareDetailScrollRestore(currentPath: string) {
  const position = readSessionValue<DetailReturnPosition>(RETURN_POSITION_KEY);
  if (!position || position.targetPath !== currentPath || Date.now() - position.savedAt > MAX_POSITION_AGE_MS) return null;

  const pending: PendingScrollRestore = {
    sourcePath: position.sourcePath,
    scrollY: position.scrollY,
    savedAt: Date.now(),
  };
  writeSessionValue(PENDING_RESTORE_KEY, pending);
  removeSessionValue(RETURN_POSITION_KEY);
  return pending;
}

export function peekPendingScrollRestore(currentPath: string) {
  const pending = readSessionValue<PendingScrollRestore>(PENDING_RESTORE_KEY);
  if (!pending || pending.sourcePath !== currentPath || Date.now() - pending.savedAt > MAX_POSITION_AGE_MS) return null;
  return pending;
}

export function takePendingScrollRestore(currentPath: string) {
  const pending = peekPendingScrollRestore(currentPath);
  if (!pending) return null;
  removeSessionValue(PENDING_RESTORE_KEY);
  return pending;
}
