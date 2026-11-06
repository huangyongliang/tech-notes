Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/topics/topics", text: "主题" },
      { pagePath: "/pages/recent/recent", text: "最近" },
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
