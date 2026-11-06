const CAPTION = "图 · 点按放大";
const BANNER = "图表未生成 · 显示源码";

function windowHeight(): number {
  if (typeof wx.getWindowInfo === "function") {
    const info = wx.getWindowInfo();
    if (info && info.windowHeight) return info.windowHeight;
  }
  const legacy = wx.getSystemInfoSync();
  return legacy.windowHeight || 844;
}

Component({
  properties: {
    src: { type: String, value: "" },
    w: { type: Number, value: 0 },
    h: { type: Number, value: 0 },
    alt: { type: String, value: "" },
    source: { type: String, value: "" },
    title: { type: String, value: "" },
  },
  data: {
    failed: false,
    wide: false,
    collapsed: false,
    dispW: 0,
    dispH: 0,
    clipH: 0,
    caption: CAPTION,
    banner: BANNER,
  },
  lifetimes: {
    attached() {
      this.syncCaption();
      if (!String(this.properties.src || "")) {
        console.warn("diagram missing src");
        this.setData({ failed: true });
        return;
      }
      const naturalW = Number(this.properties.w) || 0;
      const naturalH = Number(this.properties.h) || 0;
      const wide = naturalW > 360;
      this.setData({
        wide,
        dispW: wide ? Math.round(naturalW) : 0,
        dispH: wide ? Math.round(naturalH) : 0,
        collapsed: naturalH > 1200,
        clipH: Math.round(windowHeight()),
      });
      this.layout();
    },
  },
  observers: {
    title() {
      this.syncCaption();
    },
  },
  methods: {
    syncCaption() {
      const title = String(this.properties.title || "").trim();
      this.setData({ caption: title || CAPTION });
    },
    layout() {
      const naturalW = Number(this.properties.w) || 0;
      const naturalH = Number(this.properties.h) || 0;
      const query = this.createSelectorQuery();
      query.select(".tn-fig__frame").boundingClientRect();
      query.exec((res) => {
        const rect = res && res[0];
        const inner = rect && rect.width ? rect.width : 0;
        if (!inner || !naturalW || !naturalH) return;
        const wide = naturalW > inner + 1;
        const dispW = wide ? naturalW : inner;
        const dispH = naturalH * (dispW / naturalW);
        const viewH = windowHeight();
        this.setData({
          wide,
          collapsed: dispH > viewH * 1.5,
          dispW: Math.round(dispW),
          dispH: Math.round(dispH),
          clipH: Math.round(viewH),
        });
      });
    },
    onImgError() {
      console.warn("diagram image failed", this.properties.src);
      this.setData({ failed: true });
    },
    onExpand() {
      this.setData({ collapsed: false });
    },
    onPreview() {
      const src = String(this.properties.src || "");
      if (!src || this.data.failed) return;
      wx.previewImage({
        current: src,
        urls: [src],
        fail: () => this.previewCopy(src),
      });
    },
    previewCopy(src: string) {
      wx.getImageInfo({
        src,
        success: (info) => {
          const path = info.path;
          if (!path) {
            this.previewRead(src);
            return;
          }
          wx.previewImage({
            current: path,
            urls: [path],
            fail: () => this.previewRead(src),
          });
        },
        fail: () => this.previewRead(src),
      });
    },
    previewRead(src: string) {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: src,
        success: (res) => {
          const dest = `${wx.env.USER_DATA_PATH}/tn-diagram.png`;
          fs.writeFile({
            filePath: dest,
            data: res.data,
            success: () => {
              wx.previewImage({ current: dest, urls: [dest] });
            },
            fail: () => {
              wx.showToast({ title: "图片打不开", icon: "none" });
            },
          });
        },
        fail: () => {
          wx.showToast({ title: "图片打不开", icon: "none" });
        },
      });
    },
  },
});
