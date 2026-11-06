export function selectTab(page: WechatMiniprogram.Page.TrivialInstance, selected: number): void {
  const getter = page.getTabBar;
  if (typeof getter !== "function") return;
  const tab = getter.call(page) as WechatMiniprogram.Component.TrivialInstance | null;
  tab?.setData({ selected });
}
