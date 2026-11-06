# tech-notes 小程序骨架

离线阅读骨架，对齐 D1 信息架构。视觉只接到 `styles/tokens.wxss` 的 `page` 变量，细部样式以后再补。

## 页面

| 页面 | 入口 |
|------|------|
| 主题 `pages/topics` | 底栏。搜索条、关于、主题卡、学习路线 |
| 最近 `pages/recent` | 底栏。本机 `wx.setStorage`，可空 |
| 分类 `pages/category` | 主题卡进入。底栏是页面里的 `bottom-nav`，高亮「主题」 |
| 阅读 `pages/reader` | 章节进入。没有底栏 |
| 搜索 `pages/search` | 独立页面。构建索引含标题和正文，只覆盖这 35 篇 |
| 关于 `pages/about` | 许可、免责声明、仓库链接（复制，不打开网页）。没有底栏 |

底栏只有「主题」「最近」。微信的 custom tabBar 只挂在 tab 页上，所以：

- 主题、最近：`app.json` → `custom-tab-bar`，里面用 `components/bottom-nav`。
- 分类：同一组件，`dock="page"`，写在页面底部。不是靠 tabBar 自动出现。
- 阅读、搜索、关于：不放这个组件。

## 内容

固定 **35** 篇，写在 `scripts/build_miniapp_content.py`：

- `topics/roadmap/README.md`
- 零基础、计算机基础、编程入门、Java 的主题 README 和全部章节（5 + 7 + 6 + 12）

不打包微服务、AI、游戏模式，也不跟随这些目录的新章节，除非改 manifest 并且把篇数维持在约定值。

阅读时长：去掉围栏代码、`<details>` 参考答案和链接 URL 后数汉字，400 字/分钟向上取整，最少 1 分钟。`java/05-concurrency` 为 412 字、约 2 分钟。

## 渲染

`python3 scripts/build_miniapp_content.py` 把 Markdown 编成 `data/catalog.ts` 里的节点。阅读页用原生组件画节点：

- `components/callout` — `> [!NOTE|TIP|WARNING]`
- `components/code-block` — 围栏代码，横向滚动，复制
- `components/answer-fold` — summary 为「参考答案」的 `<details>`，默认收起
- 普通 `>` 引用不是 callout

不使用 `web-view`，也不在运行时拉取远程渲染器。

## 检查

```bash
python3 scripts/build_miniapp_content.py
python3 scripts/test_miniapp_content.py
cd miniprogram && npm ci && npm run typecheck
node --experimental-strip-types ../scripts/miniapp_links.test.ts
```

用微信开发者工具打开本目录即可看结构。不要上传、不要预览发布。
