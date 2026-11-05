# tech-notes 技术笔记

个人技术学习笔记：按主题整理链接、短笔记和学习记录，方便浏览和复习。

[主题索引](topics/) · [笔记](notes/) · [精选资料](resources/) · [贡献指南](CONTRIBUTING.md)

---

## 技术栈导航

| 主题 | 内容 | 状态 |
|------|------|------|
| ☕ [Java 技术栈 Java Stack](topics/java/) | 语言、JVM、Spring 生态，12 个子主题 | 🟡 搭建中 |
| 💻 [编程 Programming](topics/programming/) | 编程语言、算法、设计 | ⚪ 待开始 |
| 🌐 [Web](topics/web/) | 前端、后端、协议 | ⚪ 待开始 |
| 🤖 [AI / ML](topics/ai-ml/) | 机器学习、LLM | ⚪ 待开始 |
| 🖥️ [系统 Systems](topics/systems/) | 操作系统、网络、数据库、分布式 | ⚪ 待开始 |
| 🚀 [DevOps](topics/devops/) | CI/CD、容器、云 | ⚪ 待开始 |
| 🔍 [产品调研 Product Research](topics/product-research/) | 产品、竞品、技术选型 | ⚪ 待开始 |

🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

> [!TIP]
> 第一次来？从 [Java 技术栈](topics/java/) 开始，子主题按学习顺序排好了：语言基础 → 集合 → 并发 → JVM → Spring。

## 学习路线

```mermaid
flowchart LR
  A[收集 Inbox] --> B[归类 Topic] --> C[沉淀 Note]
  B --> J[Java]
  B --> P[编程]
  B --> W[Web]
  B --> S[系统]
  B --> D[DevOps]
  B --> M[AI / ML]
```

1. **收集**：新链接或想法先放进 [`topics/inbox/`](topics/inbox/)。
2. **归类**：定期整理到对应的 `topics/<topic>/`，并更新那个主题的「资料索引」。
3. **沉淀**：值得深入的内容，用 [`templates/note.md`](https://github.com/huangyongliang/tech-notes/blob/main/templates/note.md) 写成笔记，放进 [`notes/`](notes/)。

## 目录结构

| 路径 | 用途 |
|------|------|
| [`topics/`](topics/) | 按主题分类，每个主题都有一个 README 索引 |
| [`topics/inbox/`](topics/inbox/) | 暂存还没分类的链接和笔记 |
| [`notes/`](notes/) | 跨主题或较长的笔记 |
| [`resources/`](resources/) | 精选外部资料，[`links.md`](resources/links.md) 是链接表 |
| [`templates/`](https://github.com/huangyongliang/tech-notes/tree/main/templates) | 笔记模板和主题 README 模板 |

## 如何使用

在 GitHub 网页上直接点开目录就能浏览。想在本地看：

```bash
git clone https://github.com/huangyongliang/tech-notes.git
cd tech-notes
```

> [!NOTE]
> 想补充内容？命名、提交和 PR 的约定见 [贡献指南](CONTRIBUTING.md)，排版约定见 [展示规范](STYLE.md)。

## 许可证

笔记内容采用 [CC BY 4.0](https://github.com/huangyongliang/tech-notes/blob/main/LICENSE) 许可，© tech-notes contributors。
