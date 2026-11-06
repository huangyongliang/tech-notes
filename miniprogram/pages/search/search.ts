import { getCatalog } from "../../data/index";
import { openListed } from "../../utils/nav";

interface Hit {
  id: string;
  kind: string;
  topicId: string;
  title: string;
  pathLabel: string;
}

interface Entry {
  id: string;
  kind: string;
  topicId: string;
  title: string;
  pathLabel: string;
  haystack: string;
}

function buildIndex(): Entry[] {
  const catalog = getCatalog();
  const entries: Entry[] = [];
  const push = (entry: Entry) => entries.push(entry);
  push({
    id: catalog.roadmap.id,
    kind: "roadmap",
    topicId: "roadmap",
    title: `${catalog.roadmap.titleZh} ${catalog.roadmap.titleEn}`.trim(),
    pathLabel: catalog.roadmap.path,
    haystack: [
      catalog.roadmap.titleZh,
      catalog.roadmap.titleEn,
      catalog.roadmap.summary,
      catalog.roadmap.path,
    ]
      .join("\n")
      .toLowerCase(),
  });
  for (const group of catalog.groups) {
    for (const topic of group.topics) {
      push({
        id: topic.id,
        kind: "topic",
        topicId: topic.id,
        title: `${topic.titleZh} ${topic.titleEn}`.trim(),
        pathLabel: `topics/${topic.id}`,
        haystack: [topic.titleZh, topic.titleEn, topic.blurb, topic.summary].join("\n").toLowerCase(),
      });
      for (const chapter of topic.chapters) {
        push({
          id: chapter.id,
          kind: "chapter",
          topicId: topic.id,
          title: `${chapter.titleZh} ${chapter.titleEn}`.trim(),
          pathLabel: chapter.path,
          haystack: [
            chapter.titleZh,
            chapter.titleEn,
            chapter.summary,
            topic.titleZh,
            chapter.path,
          ]
            .join("\n")
            .toLowerCase(),
        });
      }
    }
  }
  return entries;
}

let INDEX: Entry[] | null = null;

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
    if (!INDEX) INDEX = buildIndex();
    const hits = INDEX.filter((entry) => entry.haystack.includes(needle)).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      topicId: entry.topicId,
      title: entry.title,
      pathLabel: entry.pathLabel,
    }));
    this.setData({ query, hits, phase: hits.length ? "list" : "none" });
  },
  onOpen(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const kind = String(event.currentTarget.dataset.kind || "");
    const topicId = String(event.currentTarget.dataset.topic || "");
    if (id) openListed(kind, id, topicId);
  },
});
