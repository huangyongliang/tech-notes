# Markdown 展示规范 {#markdown-markdown-display-guide}

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

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

[主题索引](topics/) · [笔记](notes/) · [精选资料](resources/) · [贡献指南](CONTRIBUTING.md)

---

## 技术栈导航

| 主题 | 内容 | 状态 |
|------|------|------|
| 🗺️ [学习路线 Roadmap](topics/roadmap/) | 从零到 AI 的六个阶段总览 | 🟡 搭建中 |
| 🌱 [零基础入门 Getting Started](topics/getting-started/) | 电脑、网络、自学方法 | ⚪ 待开始 |
| 🧮 [计算机基础](topics/cs-basics/) | 组成、OS、Linux、Git、网络、DSA、数据库 | ⚪ 待开始 |
| 🔧 [编程入门 Programming Basics](topics/programming-basics/) | 第一门语言 C | ⚪ 待开始 |
| ☕ [Java](topics/java/) | 语言、JVM、Spring 生态 | 🟡 搭建中 |
| 🧩 [微服务 Microservices](topics/microservices/) | 网关、治理、消息、可观测、K8s | 🟡 搭建中 |
| 🤖 [AI 技术栈 AI Stack](topics/ai/) | 大模型、RAG、Agent、MCP、推理部署 | ⚪ 待开始 |
| 💻 [编程 Programming](topics/programming/) | 语言定义了什么（语法、语义、类型、求值与内存）; 不建算法/设计模式目录 | ⚪ 待开始 |
| 🌐 [Web](topics/web/) | 源与框架约定（渲染、请求处理、跨越边界）; 不建 protocols/ | 🟡 搭建中 |
| 🖥️ [系统 Systems](topics/systems/) | OS、网络、数据库、分布式 | ⚪ 待开始 |
| 🚀 [DevOps](topics/devops/) | 流水线保证什么（可重复、来源、晋级门禁、回滚与审计）; 不建容器/云/可观测目录 | ⚪ 待开始 |
| 🔍 [产品调研 Product Research](topics/product-research/) | 调研记录留下什么（问题与约束、对照条件、选型、失效与修订）; 不建竞品/用户研究目录 | 🟡 搭建中 |
| 🧱 [软件工程理论 Software Engineering Theory](topics/software-engineering/) | 软件工程约束什么（复杂性与变化、模块、规格、验证）; 不建过程框架/设计模式目录 | 🟡 搭建中 |

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

- 子目录表的链接文字用中文。专名（Java、API、Git、Spring、HTTP）保留原文，不再在标题末尾加英文释义。改标题时用 `{#原来的锚点}` 保住旧地址。
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
- 主题章节以知识正文为主。读者不解题、不展开参考答案，也应该能读到该页承诺的定义、符号、定理前提和证明或推导。
- 例题用来演算已经写明的概念。不要把唯一的定义或证明只放在例题里，更不要只放在折叠答案里。
- 章末的任务、练习和自测是可选核对，不把一篇笔记写成题库，也不为了凑题数改写结论。
- 前置分成两类：不先读就无法理解本页论证的，写清楚；只是想对照一般叙述时再打开的，标成按需，不要写成进门条件。
- 定理写出假设。必要条件不要写成充分条件。自环、重边、有向图和顶点数的边界，在用到它们的那一句话里说明。

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

- 不用 HTML 标签排版（`<div align="center">`、`<br>`、`<img width>` 等）。例外：`website/` 目录只给网站用（首页 `website/index.md` 和样式 `website/stylesheets/extra.css`），可以用卡片、按钮等站点专用写法。
- 例外：练习的参考答案可以折叠，写法固定为 `<details markdown><summary>参考答案</summary>`，`</summary>` 后空一行再写 Markdown 正文，最后用 `</details>` 收尾。除此之外的 HTML 仍然禁止。
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
- [ ] 没有 HTML 排版标签和外部图片（练习参考答案的 `<details markdown>` 除外）
- [ ] 参考答案折叠用 `<details markdown><summary>参考答案</summary>`，summary 后空一行，以 `</details>` 结尾，在 GitHub 和网站上都能正常展开
- [ ] 中英文之间有空格
