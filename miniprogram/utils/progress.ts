/** Local chapter checklist. Device storage only — no account and no cloud sync. */

export const PROGRESS_KEY = "tn_progress_v1";

/** Flat points per checked chapter. The strip is a count, not the site quest table. */
export const XP_PER_CHAPTER = 100;

export interface ProgressView {
  count: number;
  xp: number;
  xpLabel: string;
  badge: string;
  badgeLine: string;
  checked: boolean;
}

/** Accept only `{ cleared: string[] }`. Anything else reads as no progress. */
export function parseCleared(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const cleared = (raw as { cleared?: unknown }).cleared;
  if (!Array.isArray(cleared)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of cleared) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function toggleCleared(ids: readonly string[], id: string): string[] {
  if (!id) return ids.slice();
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

/**
 * Next stored value after tapping a chapter.
 * Ids outside `allowed` (topic hubs, roadmap, junk) are dropped and cannot be added.
 */
export function applyToggle(
  raw: unknown,
  id: string,
  allowed: ReadonlySet<string>,
): { cleared: string[] } {
  const current = parseCleared(raw).filter((item) => allowed.has(item));
  if (!id || !allowed.has(id)) return { cleared: current };
  return { cleared: toggleCleared(current, id) };
}

/** Badge from how many chapters are checked. `total` makes the last step "all clear". */
export function badgeName(count: number, total: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n <= 0) return "未出发";
  if (total > 0 && n >= total) return "路线通关";
  if (n >= 20) return "熟路";
  if (n >= 10) return "在路上";
  return "开了个头";
}

export function progressView(
  ids: readonly string[],
  allowed: ReadonlySet<string>,
  currentId?: string,
): ProgressView {
  const cleared: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    cleared.push(id);
  }
  const count = cleared.length;
  const xp = count * XP_PER_CHAPTER;
  const badge = badgeName(count, allowed.size);
  const badgeLine = count === 0 ? `${badge} · 还没有通关` : `${badge} · 已通关 ${count} 章`;
  return {
    count,
    xp,
    xpLabel: `${xp} XP`,
    badge,
    badgeLine,
    checked: !!currentId && seen.has(currentId),
  };
}

export function clearHint(checked: boolean): string {
  return checked ? `已记 ${XP_PER_CHAPTER} XP` : `+${XP_PER_CHAPTER} XP`;
}

export function readCleared(): string[] {
  try {
    return parseCleared(wx.getStorageSync(PROGRESS_KEY));
  } catch {
    return [];
  }
}

export function loadProgress(allowed: ReadonlySet<string>, currentId?: string): ProgressView {
  return progressView(readCleared(), allowed, currentId);
}

export function toggleChapter(id: string, allowed: ReadonlySet<string>): ProgressView {
  let raw: unknown;
  try {
    raw = wx.getStorageSync(PROGRESS_KEY);
  } catch {
    raw = undefined;
  }
  if (!id || !allowed.has(id)) return progressView(parseCleared(raw), allowed, id);
  const stored = applyToggle(raw, id, allowed);
  wx.setStorageSync(PROGRESS_KEY, stored);
  return progressView(stored.cleared, allowed, id);
}
