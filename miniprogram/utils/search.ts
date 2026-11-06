import type { Block, Inline } from "../data/types";

export interface TextRun {
  k: string;
  text: string;
  mark: boolean;
}

export interface WhereTopic {
  id: string;
  titleZh: string;
  chapters: { id: string; num: string }[];
}

export interface QueryDoc {
  id: string;
  kind: string;
  topicId: string;
  title: string;
  titleText: string;
  bodyText: string;
  where: string;
  prose: string;
}

export interface QueryHit {
  id: string;
  kind: string;
  topicId: string;
  where: string;
  titleRuns: TextRun[];
  snippetRuns: TextRun[];
}

const SNIP = 20;

function inlineText(nodes: Inline[] | undefined): string {
  if (!nodes) return "";
  let out = "";
  for (const node of nodes) {
    if (node.t === "text" || node.t === "code" || node.t === "link") out += node.v;
    else out += inlineText(node.c);
  }
  return out;
}

/** Prose for snippets. Drops fenced code and 参考答案 folds. Inline code stays. */
export function proseFromBlocks(blocks: Block[]): string {
  const parts: string[] = [];
  const walk = (list: Block[]): void => {
    for (const block of list) {
      switch (block.t) {
        case "code":
        case "fold":
          break;
        case "h":
          parts.push(block.text);
          break;
        case "p":
          parts.push(inlineText(block.inlines));
          break;
        case "ul":
        case "ol":
          for (const item of block.items) parts.push(inlineText(item.inlines));
          break;
        case "table":
          for (const cell of block.header) parts.push(inlineText(cell));
          for (const row of block.rows) {
            for (const cell of row) parts.push(inlineText(cell));
          }
          break;
        case "quote":
        case "callout":
          walk(block.blocks);
          break;
        default:
          break;
      }
    }
  };
  walk(blocks);
  return parts.filter((part) => part.trim()).join("\n");
}

export function chapterWhere(kind: string, id: string, topicId: string, topics: WhereTopic[]): string {
  if (kind === "roadmap" || id === "roadmap") return "学习路线";
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return id;
  if (kind === "topic") return `${topic.titleZh} / 主题`;
  const chapter = topic.chapters.find((item) => item.id === id);
  if (!chapter) return topic.titleZh;
  return `${topic.titleZh} / ${chapter.num}`;
}

function stamp(runs: Array<{ text: string; mark: boolean }>): TextRun[] {
  return runs
    .filter((run) => run.text)
    .map((run, index) => ({ k: String(index), text: run.text, mark: run.mark }));
}

export function highlight(text: string, needle: string): TextRun[] {
  const q = needle.trim().toLowerCase();
  if (!text) return [];
  if (!q) return stamp([{ text, mark: false }]);
  const lower = text.toLowerCase();
  const runs: Array<{ text: string; mark: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at < 0) {
      runs.push({ text: text.slice(i), mark: false });
      break;
    }
    if (at > i) runs.push({ text: text.slice(i, at), mark: false });
    runs.push({ text: text.slice(at, at + q.length), mark: true });
    i = at + q.length;
  }
  return stamp(runs);
}

/** About 20 characters on each side of the first hit. Two-line clamp is CSS. */
export function snippetRuns(prose: string, needle: string): TextRun[] {
  const compact = prose.replace(/\s+/g, " ").trim();
  if (!compact) return [];
  const q = needle.trim().toLowerCase();
  const at = q ? compact.toLowerCase().indexOf(q) : -1;
  if (at < 0) {
    const clip = compact.slice(0, SNIP * 2);
    const text = clip.length < compact.length ? `${clip}…` : clip;
    return stamp([{ text, mark: false }]);
  }
  const start = Math.max(0, at - SNIP);
  const end = Math.min(compact.length, at + q.length + SNIP);
  const runs: Array<{ text: string; mark: boolean }> = [];
  if (start > 0) runs.push({ text: "…", mark: false });
  const window = compact.slice(start, end);
  const lower = window.toLowerCase();
  let i = 0;
  while (i < window.length) {
    const hit = lower.indexOf(q, i);
    if (hit < 0) {
      runs.push({ text: window.slice(i), mark: false });
      break;
    }
    if (hit > i) runs.push({ text: window.slice(i, hit), mark: false });
    runs.push({ text: window.slice(hit, hit + q.length), mark: true });
    i = hit + q.length;
  }
  if (end < compact.length) runs.push({ text: "…", mark: false });
  return stamp(runs);
}

/** Title hits first, then body hits. Order inside a rank follows the catalog. */
export function queryDocs(docs: QueryDoc[], raw: string): QueryHit[] {
  const needle = raw.trim().toLowerCase();
  if (!needle) return [];
  const ranked: { index: number; rank: number; hit: QueryHit }[] = [];
  docs.forEach((doc, index) => {
    const inTitle = doc.titleText.includes(needle);
    const inBody = doc.bodyText.includes(needle);
    if (!inTitle && !inBody) return;
    ranked.push({
      index,
      rank: inTitle ? 0 : 1,
      hit: {
        id: doc.id,
        kind: doc.kind,
        topicId: doc.topicId,
        where: doc.where,
        titleRuns: highlight(doc.title, needle),
        snippetRuns: snippetRuns(doc.prose, needle),
      },
    });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map((row) => row.hit);
}
