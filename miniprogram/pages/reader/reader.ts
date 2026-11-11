import { chapterIdSet, getCatalog, getDoc } from "../../data/index";
import { loadChapterPack } from "../../data/packages";
import type { Block, TocItem } from "../../data/types";
import { clearHint as hintFor, loadProgress, toggleChapter } from "../../utils/progress";
import { pushRecent } from "../../utils/recent";

interface NavRef {
  id: string;
  label: string;
}

function neighbors(docId: string): { prev: NavRef | null; next: NavRef | null } {
  const catalog = getCatalog();
  for (const group of catalog.groups) {
    for (const topic of group.topics) {
      const index = topic.chapters.findIndex((chapter) => chapter.id === docId);
      if (index < 0) continue;
      const prev = topic.chapters[index - 1];
      const next = topic.chapters[index + 1];
      return {
        prev: prev ? { id: prev.id, label: `${prev.num} ${prev.titleZh}` } : null,
        next: next ? { id: next.id, label: `${next.num} ${next.titleZh}` } : null,
      };
    }
  }
  return { prev: null, next: null };
}

function progressFields(id: string, isChapter: boolean): {
  canClear: boolean;
  cleared: boolean;
  clearHint: string;
} {
  if (!isChapter) return { canClear: false, cleared: false, clearHint: "" };
  const view = loadProgress(chapterIdSet(), id);
  return {
    canClear: true,
    cleared: view.checked,
    clearHint: hintFor(view.checked),
  };
}

Page({
  data: {
    docId: "",
    missing: false,
    title: "",
    crumb: "",
    minutesLabel: "",
    toc: [] as TocItem[],
    tocOpen: false,
    blocks: [] as Block[],
    prev: null as NavRef | null,
    next: null as NavRef | null,
    anchor: "",
    canClear: false,
    cleared: false,
    clearHint: "",
    loading: false,
  },
  ticket: 0,
  onLoad(query: Record<string, string | undefined>) {
    this.load(decodeURIComponent(query.id || ""));
  },
  onShow() {
    if (!this.data.docId || this.data.missing) return;
    const doc = getDoc(this.data.docId);
    if (!doc) return;
    this.setData(progressFields(doc.id, doc.kind === "chapter"));
  },
  load(id: string) {
    const doc = id ? getDoc(id) : null;
    if (doc && doc.kind === "topic") {
      wx.redirectTo({
        url: `/pages/category/category?topic=${encodeURIComponent(doc.topicId)}`,
      });
      return;
    }
    if (!doc) {
      this.setData({
        docId: id,
        missing: true,
        loading: false,
        blocks: [],
        tocOpen: false,
        canClear: false,
        cleared: false,
        clearHint: "",
      });
      return;
    }
    const catalog = getCatalog();
    let topicName = "";
    for (const group of catalog.groups) {
      const topic = group.topics.find((item) => item.id === doc.topicId);
      if (topic) topicName = topic.titleZh;
    }
    const navTitle = doc.num ? `${doc.num} ${doc.titleZh}` : doc.titleZh;
    wx.setNavigationBarTitle({ title: navTitle });
    const edge = neighbors(doc.id);
    const mine = ++this.ticket;
    const chapter = doc.kind === "chapter";
    this.setData({
      docId: doc.id,
      missing: false,
      loading: chapter,
      title: doc.titleEn ? `${doc.titleZh} ${doc.titleEn}` : doc.titleZh,
      crumb: doc.num ? `${topicName} › ${doc.num}` : topicName || "路线",
      minutesLabel: `约 ${doc.minutes} 分钟`,
      toc: chapter ? [] : doc.toc,
      tocOpen: false,
      blocks: chapter ? [] : doc.blocks,
      prev: edge.prev,
      next: edge.next,
      anchor: "",
      ...progressFields(doc.id, chapter),
    });
    pushRecent({
      id: doc.id,
      title: doc.titleEn ? `${doc.titleZh} ${doc.titleEn}` : doc.titleZh,
      pathLabel: doc.id,
      ts: Date.now(),
    });
    if (!chapter) return;
    const packageId = doc.packageId || "";
    loadChapterPack(packageId)
      .then((pack) => {
        if (mine !== this.ticket) return;
        const body = pack.docs[doc.id];
        if (!body) {
          this.setData({ missing: true, loading: false, blocks: [] });
          return;
        }
        this.setData({ loading: false, blocks: body.blocks, toc: body.toc });
      })
      .catch(() => {
        if (mine !== this.ticket) return;
        this.setData({ missing: true, loading: false, blocks: [] });
      });
  },
  retry() {
    this.load(this.data.docId);
  },
  toggleToc() {
    this.setData({ tocOpen: !this.data.tocOpen });
  },
  jumpToc(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    this.setData({ tocOpen: false, anchor: id });
    if (!id) return;
    wx.pageScrollTo({ selector: `#${id}`, duration: 0 });
  },
  openNav(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    wx.redirectTo({ url: `/pages/reader/reader?id=${encodeURIComponent(id)}` });
  },
  onToggleClear() {
    if (!this.data.canClear || !this.data.docId) return;
    const view = toggleChapter(this.data.docId, chapterIdSet());
    this.setData({
      cleared: view.checked,
      clearHint: hintFor(view.checked),
    });
  },
});
