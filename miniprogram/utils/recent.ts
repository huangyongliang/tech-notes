import type { RecentEntry } from "../data/types";
import { PROGRESS_KEY } from "./progress";

/** Recent and favorites. Chapter checklist is `tn_progress_v1` (`PROGRESS_KEY`). */
export const RECENT_KEY = "tn_recent_v1";
export const FAVORITES_KEY = "tn_favorites_v1";

const LIMIT = 30;

export function readRecent(): RecentEntry[] {
  try {
    const raw = wx.getStorageSync(RECENT_KEY) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is RecentEntry =>
        !!item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.pathLabel === "string" &&
        typeof item.ts === "number",
    );
  } catch {
    return [];
  }
}

export function pushRecent(entry: RecentEntry): void {
  const next = [entry, ...readRecent().filter((item) => item.id !== entry.id)].slice(0, LIMIT);
  wx.setStorageSync(RECENT_KEY, next);
}

/** Removes recent, favorites, and chapter progress. Does not wipe any other key. */
export function clearLocalRecords(): void {
  for (const key of [RECENT_KEY, FAVORITES_KEY, PROGRESS_KEY]) {
    try {
      wx.removeStorageSync(key);
    } catch {
      /* already empty */
    }
  }
}

export function formatWhen(ts: number): string {
  const date = new Date(ts);
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = start(new Date()) - start(date);
  if (diff === 0) return "今天";
  if (diff === 86400000) return "昨天";
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}
