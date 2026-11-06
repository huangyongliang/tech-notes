Component({
  properties: {
    lang: { type: String, value: "text" },
    code: { type: String, value: "" },
  },
  methods: {
    onCopy() {
      wx.setClipboardData({ data: String(this.data.code || "") });
    },
  },
});
