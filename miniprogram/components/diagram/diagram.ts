const CAPTION = "图 · 点按放大";
const CAPTION_WIDE = "图 · 左右滑动 · 点按放大";
const BANNER = "图表未生成 · 显示源码";

function windowHeight(): number {
  if (typeof wx.getWindowInfo === "function") {
    const info = wx.getWindowInfo();
    if (info && info.windowHeight) return info.windowHeight;
  }
  const legacy = wx.getSystemInfoSync();
  return legacy.windowHeight || 844;
}

function captionFor(title: string, wide: boolean): string {
  const text = title.trim();
  if (text) return text;
  return wide ? CAPTION_WIDE : CAPTION;
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
      this.applyCaption(false);
      if (!String(this.properties.src || "")) {
        console.warn("diagram missing src");
        this.setData({ failed: true });
        return;
      }
      const naturalW = Number(this.properties.w) || 0;
      const naturalH = Number(this.properties.h) || 0;
      const viewH = windowHeight();
      const wide = naturalW > 360;
      this.setData({
        wide,
        dispW: Math.round(naturalW),
        dispH: Math.round(naturalH),
        collapsed: naturalH > viewH * 1.5,
        clipH: Math.round(viewH),
        caption: captionFor(String(this.properties.title || ""), wide),
      });
      this.layout();
    },
  },
  observers: {
    title() {
      this.applyCaption(Boolean(this.data.wide));
    },
  },
  methods: {
    applyCaption(wide: boolean) {
      this.setData({
        caption: captionFor(String(this.properties.title || ""), wide),
      });
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
        const viewH = windowHeight();
        // w/h are logical CSS px. Visible width is min(w, column). Never stretch.
        this.setData({
          wide,
          dispW: Math.round(naturalW),
          dispH: Math.round(naturalH),
          collapsed: naturalH > viewH * 1.5,
          clipH: Math.round(viewH),
          caption: captionFor(String(this.properties.title || ""), wide),
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
      // Card and preview share this one opaque paper PNG. No second transparent asset.
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
              wx.previewImage({
                current: dest,
                urls: [dest],
                fail: () => {
                  console.warn("diagram preview failed", dest);
                  wx.showToast({ title: "图片打开失败", icon: "none" });
                },
              });
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
