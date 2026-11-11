import { getCatalog, getDoc } from "../../data/index";
import { loadChapterPack } from "../../data/packages";
import type { SearchEntry } from "../../data/types";
import { openListed } from "../../utils/nav";
import {
  chapterWhere,
  proseFromBlocks,
  queryDocs,
  type QueryDoc,
  type QueryHit,
  type WhereTopic,
} from "../../utils/search";

let indexed: QueryDoc[] | null = null;

function index(): QueryDoc[] {
  if (indexed) return indexed;
  const catalog = getCatalog();
  const topics: WhereTopic[] = [];
  for (const group of catalog.groups) {
    for (const topic of group.topics) topics.push(topic);
  }
  indexed = catalog.search.map((entry: SearchEntry) => {
    const doc = catalog.docs[entry.id];
    return {
      id: entry.id,
      kind: entry.kind,
      topicId: entry.topicId,
      title: entry.title,
      titleText: entry.titleText,
      bodyText: entry.bodyText,
      where: chapterWhere(entry.kind, entry.id, entry.topicId, topics),
      prose: entry.prose || (doc ? proseFromBlocks(doc.blocks) : ""),
    };
  });
  return indexed;
}

Page({
  data: {
    query: "",
    hits: [] as QueryHit[],
    phase: "idle" as "idle" | "none" | "list",
  },
  onInput(event: WechatMiniprogram.Input) {
    const query = event.detail.value || "";
    if (!query.trim()) {
      this.setData({ query, hits: [], phase: "idle" });
      return;
    }
    const hits = queryDocs(index(), query);
    this.setData({ query, hits, phase: hits.length ? "list" : "none" });
  },
  onClear() {
    this.setData({ query: "", hits: [], phase: "idle" });
  },
  onOpen(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const kind = String(event.currentTarget.dataset.kind || "");
    const topicId = String(event.currentTarget.dataset.topic || "");
    if (kind === "chapter") {
      const doc = getDoc(id);
      if (doc && doc.packageId) loadChapterPack(doc.packageId).catch(() => {});
    }
    if (id) openListed(kind, id, topicId);
  },
});
