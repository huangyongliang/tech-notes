Component({
  properties: {
    /** 0 主题, 1 最近. Category keeps 0; it is not its own tab. */
    selected: { type: Number, value: 0 },
    /**
     * tab: inside custom-tab-bar, which WeChat only mounts on tab pages.
     * page: fixed bar drawn by a non-tab page (category). Reader does not use this.
     */
    dock: { type: String, value: "tab" },
  },
  data: {
    list: [
      { pagePath: "/pages/topics/topics", text: "主题", icon: "▣" },
      { pagePath: "/pages/recent/recent", text: "最近", icon: "◷" },
    ],
  },
  methods: {
    onSwitch(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) return;
      wx.switchTab({ url: item.pagePath });
    },
  },
});
