import { getCatalog } from "../../data/index";
import type { ChapterRef, TopicCard } from "../../data/types";
import { openReader } from "../../utils/nav";

interface Row {
  id: string;
  num: string;
  titleZh: string;
  titleEn: string;
}

Page({
  data: {
    missing: false,
    kicker: "",
    title: "",
    summary: "",
    rows: [] as Row[],
  },
  onLoad(query: Record<string, string | undefined>) {
    const topicId = decodeURIComponent(query.topic || "");
    const catalog = getCatalog();
    let card: TopicCard | undefined;
    for (const group of catalog.groups) {
      card = group.topics.find((topic) => topic.id === topicId);
      if (card) break;
    }
    if (!card) {
      this.setData({ missing: true });
      return;
    }
    wx.setNavigationBarTitle({ title: card.titleZh });
    this.setData({
      missing: false,
      kicker: `TOPIC / ${card.num} · ${card.count} 篇 · 易 → 深`,
      title: card.titleZh,
      summary: card.summary,
      rows: card.chapters.map((chapter: ChapterRef) => ({
        id: chapter.id,
        num: chapter.num,
        titleZh: chapter.titleZh,
        titleEn: chapter.titleEn,
      })),
    });
  },
  onChapter(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (id) openReader(id);
  },
});
