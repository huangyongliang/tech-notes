import { copyText } from "../../utils/privacy";

Component({
  properties: {
    lang: { type: String, value: "text" },
    code: { type: String, value: "" },
  },
  methods: {
    onCopy() {
      copyText(String(this.data.code || ""), (option) => wx.setClipboardData(option));
    },
  },
});
