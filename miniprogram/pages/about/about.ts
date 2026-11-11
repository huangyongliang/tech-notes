import { getCatalog } from "../../data/index";
import { copyText } from "../../utils/privacy";
import { clearLocalRecords } from "../../utils/recent";

const SITE_URL = "https://huangyongliang.github.io/tech-notes/";
const REPO_URL = "https://github.com/huangyongliang/tech-notes";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

function copyLink(data: string): void {
  copyText(data, (option) => wx.setClipboardData(option));
}

Page({
  data: {
    docCount: getCatalog().docCount,
  },
  onCopySite() {
    copyLink(SITE_URL);
  },
  onCopyRepo() {
    copyLink(REPO_URL);
  },
  onCopyLicense() {
    copyLink(LICENSE_URL);
  },
  onClearRecords() {
    wx.showModal({
      title: "清除本机记录",
      content: "只删除这台设备上的最近阅读、收藏和通关/XP 进度，不会上传。",
      confirmText: "清除",
      cancelText: "取消",
      success: (res) => {
        if (!res.confirm) return;
        clearLocalRecords();
        wx.showToast({ title: "已清除本机记录", icon: "none" });
      },
    });
  },
});
