import type { RecentEntry } from "../data/types";

const KEY = "tn_recent_v1";
const LIMIT = 30;

export function readRecent(): RecentEntry[] {
  try {
    const raw = wx.getStorageSync(KEY) as unknown;
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
  wx.setStorageSync(KEY, next);
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
