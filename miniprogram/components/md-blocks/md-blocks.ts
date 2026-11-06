import { getDoc } from "../../data/index";
import { resolveDocId } from "../../utils/links";
import { openCategory, openReader } from "../../utils/nav";

Component({
  properties: {
    blocks: { type: Array, value: [] },
    baseId: { type: String, value: "" },
  },
  methods: {
    onLink(event: WechatMiniprogram.TouchEvent) {
      const href = String(event.currentTarget.dataset.href || "");
      if (!href) return;
      if (href.startsWith("#")) {
        wx.pageScrollTo({ selector: href, duration: 0 });
        return;
      }
      const fromId = String(this.data.baseId || "");
      const id = resolveDocId(fromId, href);
      const doc = id ? getDoc(id) : null;
      if (!doc) {
        wx.showToast({ title: "链接不在当前包里", icon: "none" });
        return;
      }
      if (doc.kind === "topic") openCategory(doc.topicId);
      else openReader(doc.id);
    },
  },
});
