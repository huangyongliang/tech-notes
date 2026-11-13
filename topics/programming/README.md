# 编程 {#programming}

本主题讨论一份语言定义到底规定了什么。它不教某一门语言的语法清单，也不建算法或设计模式目录。

> 相关主题：[编程入门](../programming-basics/) · [Java](../java/) · [计算机基础](../cs-basics/) · [理论基础](../cs-theory/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 语言定义约定了什么 {#_1}

语言定义是一份约定。它规定哪些符号串是合法程序（语法），这些结构表示什么（语义），哪些程序会被类型规则拒绝（类型系统），以及求值和内存上承诺什么、撤回什么。

实现，包括编译器和虚拟机，必须遵守这份约定。某一次编译出来的结果不是定义本身。换一个实现，只要仍落在约定允许的范围里，就可以不同。

四章共用同一组分类，这里只预告：已定义、实现定义、未指定、未定义。差别在[求值与内存模型](04-evaluation-memory/)展开。

学完[编程入门](../programming-basics/)的[核心概念](../programming-basics/02-core-concepts/)和[内存与数据](../programming-basics/03-memory-and-data/)再读最顺。这不是写出第一个 C 程序的前置。C 和 Java 只作对照，不把一条语言的条款写成所有语言都如此。

## 学习路径 {#programming-path}

```mermaid
flowchart LR
  A[语法] --> B[语义] --> C[类型系统] --> D[求值与内存]
```

## 子目录 {#programming-chapters}

| # | 子目录 | 内容 | 状态 |
|---|--------|------|------|
| 01 | [语法](01-syntax/) | 合法程序的记号和结构，不决定含义 | 🟢 |
| 02 | [语义](02-semantics/) | 绑定、传递参数和求值顺序 | 🟢 |
| 03 | [类型系统](03-types/) | 何时拒绝程序，以及健全性留了哪些缺口 | 🟢 |
| 04 | [求值与内存模型](04-evaluation-memory/) | 求值策略、对象寿命，以及定义撤回的保证 | 🟢 |

🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

算法仍以[计算机基础](../cs-basics/)里的数据结构与算法为准。`languages/`、`algorithms/`、`design-patterns/` 本批不建。

## 资料索引 {#_2}

- [ISO/IEC 9899:2024](https://www.iso.org/standard/82075.html) — C 的语言定义。可读文本用公开草案 [N3220](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf)。
- [The Java Language Specification](https://docs.oracle.com/javase/specs/jls/se21/html/index.html) — Java 的语言定义。下面各章引用的是条款主题，不是某个编译器的扩展。
- [编程入门](../programming-basics/) — 如何用 C 写出声明、指针和分配。
- [Java](../java/) — Java 的语法、泛型、并发 API 和 JVM 实现。
- [计算机基础](../cs-basics/) — 补码、存储层次、进程、虚拟内存和数据结构。
- [理论基础](../cs-theory/) — 自动机、可计算性和复杂度。可以选读，不是本批前置。
