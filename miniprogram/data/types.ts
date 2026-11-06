/** Block tree produced at build time. Pages render these with native components. */

export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "link"; v: string; href: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] };

export interface TocItem {
  id: string;
  level: number;
  text: string;
}

export type Block =
  | { t: "h"; level: number; id: string; text: string }
  | { t: "p"; inlines: Inline[] }
  | { t: "ul"; items: { inlines: Inline[]; blocks?: Block[] }[] }
  | { t: "ol"; items: { n: number; inlines: Inline[]; blocks?: Block[] }[] }
  | { t: "quote"; blocks: Block[] }
  | { t: "table"; header: Inline[][]; rows: Inline[][][] }
  | { t: "callout"; kind: "note" | "tip" | "warning"; blocks: Block[] }
  | { t: "code"; lang: string; code: string; banner?: string }
  | {
      t: "diagram";
      src: string;
      w: number;
      h: number;
      pw: number;
      ph: number;
      alt: string;
      source: string;
      title?: string;
    }
  | { t: "fold"; blocks: Block[] };

export interface ChapterRef {
  id: string;
  num: string;
  titleZh: string;
  titleEn: string;
  summary: string;
  minutes: number;
  path: string;
}

export interface TopicCard {
  id: string;
  num: string;
  titleZh: string;
  titleEn: string;
  blurb: string;
  status: "wip" | "todo";
  statusLabel: string;
  summary: string;
  count: number;
  chapters: ChapterRef[];
}

export interface TopicGroup {
  id: string;
  label: string;
  topics: TopicCard[];
}

export interface Doc {
  id: string;
  kind: "chapter" | "topic" | "roadmap";
  topicId: string;
  num: string;
  titleZh: string;
  titleEn: string;
  summary: string;
  minutes: number;
  han: number;
  path: string;
  blocks: Block[];
  toc: TocItem[];
}

/** Build-time search row. Only the fixed manifest docs are present. */
export interface SearchEntry {
  id: string;
  kind: "chapter" | "topic" | "roadmap";
  topicId: string;
  title: string;
  path: string;
  titleText: string;
  bodyText: string;
}

export interface CatalogFile {
  version: string;
  docCount: number;
  groups: TopicGroup[];
  roadmap: ChapterRef;
  docs: Record<string, Doc>;
  search: SearchEntry[];
}

export interface RecentEntry {
  id: string;
  title: string;
  pathLabel: string;
  ts: number;
}
