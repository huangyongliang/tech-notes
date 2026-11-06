const REPO_URL = "https://github.com/huangyongliang/tech-notes";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

Page({
  data: {
    docCount: 35,
  },
  onCopyRepo() {
    wx.setClipboardData({ data: REPO_URL });
  },
  onCopyLicense() {
    wx.setClipboardData({ data: LICENSE_URL });
  },
});
