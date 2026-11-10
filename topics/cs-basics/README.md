# 计算机基础 {#cs-basics}

理解计算机、操作系统、网络和数据库怎么工作，掌握 Linux 命令行和 Git。与深入专题 [系统](../systems/) 分工：这里是入门闯关路径。

> 相关主题：[零基础入门](../getting-started/) · [编程入门](../programming-basics/) · [计算机理论 CS](../cs-theory/) · [系统](../systems/) · [学习路线](../roadmap/)

## 学习路径

```mermaid
flowchart LR
  A[计算机组成] --> B[操作系统] --> C[Linux 与 Shell] --> D[Git]
  D --> E[计算机网络] --> F[数据结构与算法] --> G[数据库基础]
```

## 子目录

| # | 子目录 | 内容 | 状态 |
|---|--------|------|------|
| 01 | [计算机组成](01-computer-organization/) | 数的表示、CPU、存储层次 | 🟡 |
| 02 | [操作系统](02-operating-systems/) | 进程、线程、虚拟内存、文件系统 | 🟡 |
| 03 | [Linux 与 Shell](03-linux-shell/) | 终端、管道、权限、脚本 | 🟡 |
| 04 | [Git 版本控制](04-git/) | 提交、分支、合并、远程与 PR | 🟡 |
| 05 | [计算机网络](05-networking/) | TCP/IP、DNS、HTTP / HTTPS | 🟡 |
| 06 | [数据结构与算法 DSA](06-data-structures-algorithms/) | 复杂度、线性结构、树、图；用 C 练习 | 🟡 |
| 07 | [数据库基础](07-databases/) | SQL、索引、事务 | 🟡 |
🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

## 理论基础

[理论基础](../cs-theory/) 是独立主题，不是本目录下面的选修小节。上表的 01–07 仍然是实践闯关，顺序不变。下面只是对照：实践里遇到「为什么成立」时，可以到网站上的对应章。这 14 章不在小程序打包的 35 篇里，小程序里的链接打不开这些章节。它们也不是写出第一个 C 程序的前置。

| 实践关 | 可选理论 | 它补充什么 |
|--------|----------|------------|
| 01 组成 | [命题与谓词](../cs-theory/01-logic/) · [可计算性](../cs-theory/13-computability/) | 条件的真假；无界模型与有限机器的差别 |
| 02 操作系统 | [证明与归纳](../cs-theory/03-proofs-induction/) · [有向图](../cs-theory/10-digraphs-dag/) | 不变式与终止；依赖成圈时为什么排不出顺序 |
| 04 Git | [关系](../cs-theory/02-sets-relations-functions/) · [有向图](../cs-theory/10-digraphs-dag/) | 偏序和 DAG 只作背景，命令仍以 Git 章为准 |
| 05 网络 | [图与度数](../cs-theory/05-graphs-degrees/) · [最短路](../cs-theory/11-shortest-path-proofs/) | 静态图上的连通和最短路，不代替协议 |
| 06 DSA | [图论入口](../cs-theory/05-graphs-degrees/) · [复杂度](../cs-theory/14-complexity-reductions/) | 定理条件和反例；实现仍在本关和 C |
| 07 数据库 | [集合、关系与函数](../cs-theory/02-sets-relations-functions/) | 数学关系；不覆盖 SQL 的 NULL |

## 资料索引

<!-- - [标题](链接) — 一句话说明 -->
