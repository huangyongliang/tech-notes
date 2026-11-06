export function openReader(id: string): void {
  wx.navigateTo({
    url: `/pages/reader/reader?id=${encodeURIComponent(id)}`,
  });
}

export function openCategory(topicId: string): void {
  wx.navigateTo({
    url: `/pages/category/category?topic=${encodeURIComponent(topicId)}`,
  });
}

export function openSearch(): void {
  wx.navigateTo({ url: "/pages/search/search" });
}

export function openAbout(): void {
  wx.navigateTo({ url: "/pages/about/about" });
}

export function openListed(kind: string, id: string, topicId: string): void {
  if (kind === "topic") openCategory(topicId || id);
  else openReader(id);
}
