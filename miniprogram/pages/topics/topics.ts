import { getCatalog } from "../../data/index";
import type { TopicGroup } from "../../data/types";
import { openAbout, openCategory, openReader, openSearch } from "../../utils/nav";
import { selectTab } from "../../utils/tab";

const SITE = "https://huangyongliang.github.io/tech-notes/";

interface TopicView {
  id: string;
  num: string;
  titleZh: string;
  titleEn: string;
  blurb: string;
  status: string;
  statusLabel: string;
  countLabel: string;
  external: boolean;
}

interface GroupView {
  id: string;
  label: string;
  topics: TopicView[];
}

interface ExternalTopic {
  id: string;
  group: string;
  num: string;
  titleZh: string;
  titleEn: string;
  blurb: string;
  status: "wip" | "todo";
  statusLabel: string;
}

/** Shown by name only. Not in the 35-doc reader or search index. */
const EXTERNAL: ExternalTopic[] = [
  {
    id: "microservices",
    group: "技术栈",
    num: "05",
    titleZh: "微服务",
    titleEn: "Microservices",
    blurb: "网关 · 治理 · 消息 · 可观测 · K8s",
    status: "wip",
    statusLabel: "搭建中",
  },
  {
    id: "ai",
    group: "技术栈",
    num: "06",
    titleZh: "AI 技术栈",
    titleEn: "AI Stack",
    blurb: "大模型 · RAG · Agent · MCP",
    status: "todo",
    statusLabel: "待开始",
  },
  {
    id: "programming",
    group: "技术栈",
    num: "07",
    titleZh: "编程",
    titleEn: "Programming",
    blurb: "编程语言、算法、设计",
    status: "todo",
    statusLabel: "待开始",
  },
  {
    id: "web",
    group: "技术栈",
    num: "08",
    titleZh: "Web",
    titleEn: "Web",
    blurb: "前端、后端、协议",
    status: "todo",
    statusLabel: "待开始",
  },
  {
    id: "systems",
    group: "技术栈",
    num: "09",
    titleZh: "系统",
    titleEn: "Systems",
    blurb: "操作系统、网络、数据库、分布式",
    status: "todo",
    statusLabel: "待开始",
  },
  {
    id: "devops",
    group: "技术栈",
    num: "10",
    titleZh: "DevOps",
    titleEn: "DevOps",
    blurb: "CI/CD、容器、云",
    status: "todo",
    statusLabel: "待开始",
  },
  {
    id: "product-research",
    group: "技术栈",
    num: "11",
    titleZh: "产品调研",
    titleEn: "Product Research",
    blurb: "产品、竞品、技术选型",
    status: "todo",
    statusLabel: "待开始",
  },
];

function attachExternal(groups: GroupView[]): GroupView[] {
  const next = groups.map((group) => ({ ...group, topics: group.topics.slice() }));
  for (const card of EXTERNAL) {
    let group = next.find((item) => item.id === card.group);
    if (!group) {
      group = { id: card.group, label: `// ${card.group}`, topics: [] };
      next.push(group);
    }
    group.topics.push({
      id: card.id,
      num: card.num,
      titleZh: card.titleZh,
      titleEn: card.titleEn,
      blurb: card.blurb,
      status: card.status,
      statusLabel: card.statusLabel,
      countLabel: "复制链接",
      external: true,
    });
  }
  return next;
}

Page({
  data: {
    groups: [] as GroupView[],
    roadmapTitle: "",
    roadmapEn: "",
    ticker: ["JDK 25 LTS", "Spring Boot 4.1", "Virtual Threads", "RAG"],
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
        external: false,
      })),
    }));
    this.setData({
      groups: attachExternal(groups),
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
    if (!id) return;
    if (Number(event.currentTarget.dataset.external) === 1) {
      wx.showModal({
        title: "在站点查看",
        content: "这一主题不在本版 35 篇里。小程序打不开网页，可以复制站点链接。",
        confirmText: "复制链接",
        cancelText: "取消",
        success: (res) => {
          if (!res.confirm) return;
          wx.setClipboardData({ data: `${SITE}topics/${id}/` });
        },
      });
      return;
    }
    openCategory(id);
  },
  onRoadmap() {
    openReader("roadmap");
  },
});
