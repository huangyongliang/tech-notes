# Markdown 展示规范 Markdown Display Guide

> 适用仓库：[huangyongliang/tech-notes](https://github.com/huangyongliang/tech-notes)（公开）
> 目标：只靠 GitHub 原生 Markdown 渲染，做到好看、统一、好导航。不用 HTML 排版、不用外部图床、不用 shields 徽章服务。
> 作者：优鼠（UI）· 落地：变鼠 · 验收：嘟鼠

---

## 1. 通用规则

| 项 | 规则 |
|----|------|
| 标题 | 每页只有一个 `#`，格式「中文名 English」，例如 `# 并发 Concurrency` |
| 层级 | 只用 `##` 和 `###`，不跳级，不用 `####` 以下 |
| 段落 | 标题下第一段是 1–3 句简介，不超过 120 字 |
| 列表 | 无序列表一律用 `-`；有顺序才用 `1.` |
| 表格 | 表头用中文；表格前后各空一行；单元格里不换行 |
| 代码 | 行内用反引号；代码块必须标语言（`java`、`bash`、`yaml`…） |
| 链接 | 仓库内一律相对路径，目录链接以 `/` 结尾；外链写清标题，不裸贴 URL |
| 分隔线 | 只在页首导航和正文之间用一次 `---`，正文里不用 |
| Emoji | 只在根 README 导航表和状态标记里用，正文不用 |
| 中英混排 | 中文与英文/数字之间加一个空格：`JDK 25 LTS`、`Spring Boot 4.1` |
| 时间 | 统一 `YYYY-MM-DD`，版本基线写成「版本基线（2026-11）」 |

## 2. 提示框（GitHub Alerts）

只用这三种，别的不用：

```markdown
> [!NOTE]
> 补充说明、背景信息。

> [!TIP]
> 推荐做法、学习建议。

> [!WARNING]
> 版本差异、易踩坑、已废弃写法。
```

- 一个 `##` 小节里最多一个提示框。
- 版本差异（例如「JDK 8 不支持」）一律用 `WARNING`。
- 「相关主题」这类导航不要放进提示框，用普通引用 `>`。

## 3. Mermaid 图

只在两处用：根 README 的学习路线图、主题 README 的学习路径图。笔记正文里需要流程图也可以，但每页最多一张。

- 方向统一用 `flowchart LR`（横向）；节点超过 8 个改 `TD`。
- 节点文字用「中文 English」短语，不超过 12 个字。
- 不写颜色和样式（`style`、`classDef`），交给 GitHub 深浅色主题自动适配。
- 不写 `click` 跳转（GitHub 上不生效），需要链接就放在图下方的表格里。

示例（Java 主题页）：

```mermaid
flowchart LR
  A[语言基础] --> B[集合] --> C[核心进阶] --> D[IO / NIO]
  D --> E[并发] --> F[JVM]
  F --> G[构建工具] --> H[测试] --> I[Spring]
  I --> J[持久层] --> K[性能排障] --> L[生态趋势]
```

## 4. 根 README（门面）结构

按这个顺序，不多不少：

```markdown
# tech-notes 技术笔记

一句话：个人技术学习笔记，按主题整理链接、短笔记和学习记录。

[主题索引](topics/) · [笔记](notes/) · [精选资料](resources/) · [贡献指南](CONTRIBUTING.md)

---

## 技术栈导航

| 主题 | 内容 | 状态 |
|------|------|------|
| ☕ [Java](topics/java/) | 语言、JVM、Spring 生态 | 🟡 搭建中 |
| 💻 [编程 Programming](topics/programming/) | 语言、算法、设计 | ⚪ 待开始 |
| 🌐 [Web](topics/web/) | 前端、后端、协议 | ⚪ 待开始 |
| 🤖 [AI / ML](topics/ai-ml/) | 机器学习、LLM | ⚪ 待开始 |
| 🖥️ [系统 Systems](topics/systems/) | OS、网络、数据库、分布式 | ⚪ 待开始 |
| 🚀 [DevOps](topics/devops/) | CI/CD、容器、云 | ⚪ 待开始 |
| 🔍 [产品调研 Product Research](topics/product-research/) | 产品、竞品、选型 | ⚪ 待开始 |

## 学习路线

（mermaid：inbox → topic → note 的流程，或各技术栈的总览图，二选一）

## 目录结构

（保留现有表格）

## 如何使用

（合并现在的「快速开始」和「学习路径」，`<repo-url>` 换成真实地址）

## 许可证

笔记内容采用 [CC BY 4.0](LICENSE) 许可。
```

状态标记只用三种：🟢 已完成 · 🟡 搭建中 · ⚪ 待开始。图例写在表格下方一行。

根 README 里删掉「🚧 目前只有骨架」这种状态段，状态改由导航表体现。

## 5. 主题 README 结构（如 `topics/java/README.md`）

```markdown
# Java 技术栈 Java Stack

1–3 句简介。

> 相关主题：[编程 Programming](../programming/) · [Web](../web/)

## 学习路径

（mermaid 图，见第 3 节）

## 子目录

| # | 子目录 | 内容 | 状态 |
|---|--------|------|------|
| 01 | [语言基础 Language Basics](01-language-basics/) | … | ⚪ |

## 版本基线（YYYY-MM）

> [!WARNING]
> 版本信息有时效，更新时同时改这里的日期。

- JDK：…

## 资料索引

- [标题](链接) — 一句话说明
```

- 子目录表的链接文字用「中文 English」，不再直接显示目录名。
- 序号统一两位：`01`…`12`。

## 6. 子主题 README 结构（如 `05-concurrency/README.md`）

```markdown
# 并发 Concurrency

> [Java](../) › 并发

1–3 句简介。

## 建议先收的资料

- …

## 资料索引

- [标题](链接) — 一句话说明

---

← [上一节：IO / NIO](../04-io-nio/) · [返回 Java](../) · [下一节：JVM](../06-jvm/) →
```

- 顶部面包屑替换现在的「> 上级：[Java](../)」。
- 底部加上一节 / 下一节导航；第一节没有「上一节」，最后一节没有「下一节」。

## 7. 笔记页（`templates/note.md`）

- 保留 front matter。GitHub 会把它渲染成页首表格，所以字段值写干净，不留空字符串。
- 正文小节固定：`## 背景` · `## 核心要点` · `## 示例` · `## 疑问与待办` · `## 参考资料`。
- 「核心要点」用列表，每条一句话；长解释放进 `###` 子节。

## 8. 资料索引条目格式

```markdown
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) — 虚拟线程正式版说明（JDK 21）
```

- 格式固定：`- [标题](链接) — 一句话说明`，破折号用全角 `—`。
- 一条一行，按重要性排序，不按时间。
- 空索引保留注释占位 `<!-- -->`，不要写「暂无」。

## 9. 不要做

- 不用 HTML 标签排版（`<div align="center">`、`<br>`、`<img width>` 等）。
- 不用外部徽章和图床；需要图片就放仓库 `assets/`，用相对路径。
- 不用 GitHub 不渲染的语法，比如自定义 CSS、`[TOC]` 目录标记。
- 不在标题里放链接或 emoji（根 README 导航表除外）。
- 不写真实姓名、邮箱、手机号等个人信息；署名统一用 GitHub 用户名。

## 10. 验收清单（给嘟鼠）

- [ ] 每页一个 `#`，格式「中文名 English」
- [ ] 根 README 按第 4 节顺序，导航表覆盖 `topics/README.md` 所有主题（不含 inbox）
- [ ] 主题 README 有 mermaid 学习路径，在 GitHub 上实际渲染正常
- [ ] 子主题 README 有面包屑和上一节 / 下一节导航，链接都有效
- [ ] 提示框只用 NOTE / TIP / WARNING
- [ ] 没有 HTML 排版标签和外部图片
- [ ] 中英文之间有空格
