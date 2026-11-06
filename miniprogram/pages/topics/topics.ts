import { chapterIdSet, getCatalog } from "../../data/index";
import type { TopicGroup } from "../../data/types";
import { openAbout, openCategory, openReader, openSearch } from "../../utils/nav";
import { loadProgress, progressView } from "../../utils/progress";
import { selectTab } from "../../utils/tab";

const blankProgress = progressView([], new Set<string>());

interface TopicView {
  id: string;
  num: string;
  titleZh: string;
  titleEn: string;
  blurb: string;
  status: string;
  statusLabel: string;
  countLabel: string;
}

interface GroupView {
  id: string;
  label: string;
  topics: TopicView[];
}

Page({
  data: {
    groups: [] as GroupView[],
    roadmapTitle: "",
    roadmapEn: "",
    ticker: ["JDK 25 LTS", "Spring Boot 4.1", "Virtual Threads", "RAG"],
    xpLabel: blankProgress.xpLabel,
    badgeLine: blankProgress.badgeLine,
  },
  onShow() {
    selectTab(this, 0);
    const catalog = getCatalog();
    const groups: GroupView[] = catalog.groups.map((group: TopicGroup) => ({
      id: group.id,
      label: group.label,
      topics: group.topics.map((topic) => ({
        id: topic.id,
        num: topic.num,
        titleZh: topic.titleZh,
        titleEn: topic.titleEn,
        blurb: topic.blurb,
        status: topic.status,
        statusLabel: topic.statusLabel,
        countLabel: `${topic.count} 篇`,
      })),
    }));
    const progress = loadProgress(chapterIdSet());
    this.setData({
      groups,
      roadmapTitle: catalog.roadmap.titleZh,
      roadmapEn: catalog.roadmap.titleEn,
      xpLabel: progress.xpLabel,
      badgeLine: progress.badgeLine,
    });
  },
  onSearch() {
    openSearch();
  },
  onAbout() {
    openAbout();
  },
  onTopic(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    openCategory(id);
  },
  onRoadmap() {
    openReader("roadmap");
  },
});
