import { getCatalog } from "../../data/index";
import type { TopicGroup } from "../../data/types";
import { openAbout, openCategory, openReader, openSearch } from "../../utils/nav";
import { selectTab } from "../../utils/tab";

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
    ticker: ["JDK 25 LTS", "Spring Boot 4.1", "Virtual Threads"],
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
    this.setData({
      groups,
      roadmapTitle: catalog.roadmap.titleZh,
      roadmapEn: catalog.roadmap.titleEn,
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
    if (id) openCategory(id);
  },
  onRoadmap() {
    openReader("roadmap");
  },
});
