# tech-notes 小程序骨架

离线阅读骨架，对齐 D1。颜色来自 `styles/tokens.wxss` 的 `page` 变量；页面和组件按这个变量画硬边和硬阴影。方格底在 `app.wxss`，不稳时仍是纸色 `#f4efe4`。

## 页面

| 页面 | 入口 |
|------|------|
| 主题 `pages/topics` | 底栏。搜索条（硬阴影）、学习路线横幅、关于、`// 基础` / `// 技术栈` 主题卡 |
| 最近 `pages/recent` | 底栏。本机 `wx.setStorage`，可空 |
| 分类 `pages/category` | 主题卡进入。底栏是页面里的 `bottom-nav`，高亮「主题」 |
| 阅读 `pages/reader` | 章节进入。没有底栏。上下篇是墨色底条加 accent 硬阴影 |
| 搜索 `pages/search` | 独立页面。只查这 35 篇的标题和正文。标题命中排在正文命中前，摘要约 20 字并高亮 |
| 关于 `pages/about` | 许可、免责声明、站点与仓库（复制链接，不打开网页）。没有底栏 |

底栏只有「主题」「最近」。纸色 `#f4efe4`、顶边 1px 墨线、选中项 `#ff4f12` 的 3px 短下划线，没有阴影，并留出 safe-area。微信的 custom tabBar 只挂在 tab 页上，所以：

- 主题、最近：`app.json` → `custom-tab-bar`，里面用 `components/bottom-nav`。
- 分类：同一组件，`dock="page"`，写在页面底部。不是靠 tabBar 自动出现。
- 阅读、搜索、关于：不放这个组件。

## 内容

固定 **35** 篇。路径清单在 `content-selection.json`，构建脚本只收录这份清单，并在对不上时失败：

- `topics/roadmap/README.md`
- 零基础、计算机基础、编程入门、Java 的主题 README 和全部章节（5 + 7 + 6 + 12）

不把微服务、AI 和其他未收录主题编进正文、搜索或主题页。主题页只列出已收录的四个主题。游戏模式（探索地图、NPC、BOSS）不进小程序。新增章节也不会自动进来，除非改白名单并且把篇数维持在 35。

阅读页只对章节显示「通关 / 已通关」（主题枢纽和路线页没有这个开关）。记在本机 `tn_progress_v1`，值是 `{ cleared: string[] }`，每项是章节 id，每勾一章记 100 XP。主题页用一行字显示合计和徽章：未出发、开了个头、在路上、熟路、路线通关。

关于页最下方「清除本机记录」会先确认，然后只删除本机的 `tn_recent_v1`、`tn_favorites_v1` 和 `tn_progress_v1`，不调用 `wx.clearStorage`，也不上传。

阅读时长：去掉围栏代码、`<details>` 参考答案和链接 URL 后数汉字，400 字/分钟向上取整，最少 1 分钟。`java/05-concurrency` 为 412 字、约 2 分钟。

## 渲染

`python3 scripts/build_miniapp_content.py` 把 Markdown 编成 `data/catalog.ts` 里的节点。阅读页用原生组件画节点：

- `components/callout` — `> [!NOTE|TIP|WARNING]`
- `components/code-block` — 围栏代码，横向滚动，复制
- `components/diagram` — mermaid 围栏。构建期用 mmdc 出 PNG，阅读页用原生 image，点按 `wx.previewImage`
- `components/answer-fold` — summary 为「参考答案」的 `<details>`，默认收起
- 普通 `>` 引用不是 callout

图放在阅读分包 `pages/reader/diagrams/`（`app.json` 的 `subPackages`），不进主包。文件名是源码、主题和 mermaid 版本的哈希；没变就跳过重渲。同一张不透明纸色 `#f4efe4` PNG（四周 16px）用于卡片和全屏预览。`w`/`h` 是逻辑 CSS 像素，`pw`/`ph` 是 2 倍位图。窄图按逻辑宽度居中，不拉满栏宽；逻辑宽度大于栏宽才横向滚动。渲染失败或图片加载失败时，降级成代码块，上面一条灰色提示「图表未生成 · 显示源码」，构建继续并打 WARNING。搜索正文和摘要都不收录图的源码。

重新出图（缓存命中时不用这些工具）：

```bash
cd scripts/mermaid && npm ci
# 需要本机 Chrome、fonts-noto-cjk（Noto Sans CJK SC）、pngquant
python3 scripts/build_miniapp_content.py
```

不使用 `web-view`，也不在运行时拉取远程渲染器。暗色图不在这一版生成，文件名留给以后的 `<hash>.dark.png`。

## 检查

```bash
python3 scripts/build_miniapp_content.py
python3 scripts/test_miniapp_content.py
cd miniprogram && npm ci && npm run typecheck
node --experimental-strip-types ../scripts/miniapp_links.test.ts
node --experimental-strip-types ../scripts/miniapp_search.test.ts
node --experimental-strip-types ../scripts/miniapp_progress.test.ts
```

用微信开发者工具打开本目录即可看结构（`project.config.json` 的 appid 为 `wx9982c4527dbdc2e3`，projectname 为 `大蒜技术栈`）。不要上传、不要预览发布。
