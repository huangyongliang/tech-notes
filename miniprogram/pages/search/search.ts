import { getCatalog } from "../../data/index";
import type { SearchEntry } from "../../data/types";
import { openListed } from "../../utils/nav";

interface Hit {
  id: string;
  kind: string;
  topicId: string;
  title: string;
  pathLabel: string;
}

function toHit(entry: SearchEntry): Hit {
  return {
    id: entry.id,
    kind: entry.kind,
    topicId: entry.topicId,
    title: entry.title,
    pathLabel: entry.path,
  };
}

Page({
  data: {
    query: "",
    hits: [] as Hit[],
    phase: "empty" as "empty" | "none" | "list",
  },
  onInput(event: WechatMiniprogram.Input) {
    const query = event.detail.value || "";
    const needle = query.trim().toLowerCase();
    if (!needle) {
      this.setData({ query, hits: [], phase: "empty" });
      return;
    }
    const hits = getCatalog()
      .search.filter(
        (entry) => entry.titleText.includes(needle) || entry.bodyText.includes(needle),
      )
      .map(toHit);
    this.setData({ query, hits, phase: hits.length ? "list" : "none" });
  },
  onOpen(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const kind = String(event.currentTarget.dataset.kind || "");
    const topicId = String(event.currentTarget.dataset.topic || "");
    if (id) openListed(kind, id, topicId);
  },
});
