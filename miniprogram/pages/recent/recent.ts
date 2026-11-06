import { formatWhen, readRecent } from "../../utils/recent";
import { openReader } from "../../utils/nav";
import { selectTab } from "../../utils/tab";

interface Row {
  id: string;
  title: string;
  pathLabel: string;
  when: string;
}

Page({
  data: {
    rows: [] as Row[],
    empty: true,
  },
  onShow() {
    selectTab(this, 1);
    const rows = readRecent().map((entry) => ({
      id: entry.id,
      title: entry.title,
      pathLabel: entry.pathLabel,
      when: formatWhen(entry.ts),
    }));
    this.setData({ rows, empty: rows.length === 0 });
  },
  onOpen(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (id) openReader(id);
  },
});
