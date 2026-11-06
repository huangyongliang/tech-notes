# 计算机理论 CS Theory

从逻辑与证明走向图论和计算模型：通过原创小问题、例题与证明，理解算法为什么成立、又在哪些前提下失效。

> 相关主题：[计算机基础 CS Basics](../cs-basics/) · [编程入门 Programming Basics](../programming-basics/) · [Java](../java/) · [学习路线 Roadmap](../roadmap/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 学习路径

这是基础主线的并行选修，不改变「从零 → 计算机 → C → Java → 微服务 → Python 桥梁 → AI」的学习顺序。01–04 可与 C 入门并读；05–11 在理解 DSA 图、队列与堆后学习；12–14 在熟悉归纳与程序模型后选读。

```mermaid
flowchart LR
  A[逻辑 Logic] --> B[图论 Graphs] --> C[算法 Algo] --> D[计算 Theory]
```

## 子目录

| 序号 | 子目录 | 内容 | 状态 |
|------|--------|------|------|
| 01 | [命题与谓词 Logic](01-logic/) | 把自然语言约束写成有论域的公式，分清蕴含、等价和量词顺序。 | 🟡 |
| 02 | [集合、关系与函数 Sets, Relations and Functions](02-sets-relations-functions/) | 用集合组织对象，用关系表达联系，用函数刻画唯一输出。 | 🟡 |
| 03 | [证明与归纳 Proofs and Induction](03-proofs-induction/) | 练习直接证明、逆否、反证、普通与强归纳、最小反例及循环不变式。 | 🟡 |
| 04 | [组合计数与递推 Counting and Recurrences](04-counting-recurrences/) | 先判定对象与重复，再用加乘、排列组合、鸽巢、容斥和递推计数。 | 🟡 |
| 05 | [图的建模与度数 Graphs and Degrees](05-graphs-degrees/) | 从原创连接谜题建立简单图，双重计数证明握手定理，识别同构的必要条件。 | 🟡 |
| 06 | [路径、连通与遍历 Walks, Connectivity and Tours](06-walks-connectivity-euler/) | 严格区分游走、迹、路和圈，比较欧拉遍边与哈密顿遍点。 | 🟡 |
| 07 | [树与生成树 Trees and Spanning Trees](07-trees-spanning/) | 用删叶归纳理解树的等价刻画，再用交换论证理解最小生成树。 | 🟡 |
| 08 | [二分图与匹配 Bipartite Graphs and Matchings](08-bipartite-matching/) | 证明奇圈障碍，构造增广路，并正确使用 Hall 条件。 | 🟡 |
| 09 | [着色与平面图 Coloring and Planarity](09-coloring-planarity/) | 用上下界夹住色数，从欧拉公式推导平面图边数限制。 | 🟡 |
| 10 | [有向图与依赖顺序 Digraphs and DAGs](10-digraphs-dag/) | 从入出度、强连通走到缩点和拓扑排序，分清先后约束与调度优化。 | 🟡 |
| 11 | [最短路与算法证明 Shortest Paths and Correctness](11-shortest-path-proofs/) | 用层次不变式、割前沿和松弛解释 BFS、Dijkstra、Bellman–Ford 的边界。 | 🟡 |
| 12 | [自动机与形式语言 Automata and Formal Languages](12-automata-languages/) | 认识 DFA、NFA 与正则表达式的等价性，走一遍泵引理的量词。 | 🟡 |
| 13 | [可计算性与停机问题 Computability and Halting](13-computability/) | 用图灵机模型区分可判定与可识别，理解对角化和不可判定归约。 | 🟡 |
| 14 | [复杂度与归约 Complexity and Reductions](14-complexity-reductions/) | 以输入编码长度定义 P、NP 和 NP 完全，用独立集到顶点覆盖讲清归约方向。 | 🟡 |

🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

## 和已有基础篇怎样分工

- [计算机组成](../cs-basics/01-computer-organization/) 讲机器数与硬件；这里的逻辑、数学整数和图灵机是不同抽象层次。
- [操作系统](../cs-basics/02-operating-systems/) 讲进程、内存和并发；这里补不变式、终止性与依赖图，不复写系统调用。
- [Linux 与 Shell](../cs-basics/03-linux-shell/) 是运行练习的工具入口；[Git](../cs-basics/04-git/) 保留版本控制教程，DAG 只是其背景模型之一。
- [计算机网络](../cs-basics/05-networking/) 讲协议；这里研究静态图的连通性和最短路，不冒充完整路由协议。
- [DSA](../cs-basics/06-data-structures-algorithms/) 负责容器、复杂度和 C 实现；这里重点是定理条件、反例和正确性证明。
- [数据库基础](../cs-basics/07-databases/) 讲 SQL、索引与事务；数学关系不替代关系数据库教程，经典二值逻辑也不覆盖 NULL 的三值语义。

## 使用方式

先画小图或列几种情况，写出猜想，再区分「一个可行构造」与「所有情况的证明」。闯关自测应先独立作答，再展开参考答案；证明题重视定义、前提和推理，不把会背定理名字当作通关。

代码只辅助观察：C 示例是完整程序，使用 C17 可支持的语法；Python 示例无第三方依赖，可在学过 Python 桥梁后选做。不会 Python 不影响先读最短路的数学论证。

## 资料索引

- [Start Doing Graph Theory](https://vertex.degree/) — Mikhail Lavrov 的开放图论教材，本专题参考其先探索问题再组织证明的教学方式；没有翻译或复用原书谜题、图片或习题。
- [Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/mcs.pdf) — 2018 版免费教材，逻辑、关系、归纳、图与计数的主参考。
- [MIT Theory of Computation](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/lecture-notes/) — Sipser 的开放课程，用于自动机、可计算性与复杂度。
- [Princeton Algorithms：Graphs](https://algs4.cs.princeton.edu/40graphs/) — 图算法的免费配套讲解，适合与 Java 实现对照。
- [Book of Proof](https://richardhammack.github.io/BookOfProof/) — 免费证明入门，补充集合、关系与函数。
