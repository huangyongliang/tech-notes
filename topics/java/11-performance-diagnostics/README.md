# 性能与诊断 Performance & Diagnostics

> [Java](../) › 性能与诊断

CPU、内存、线程问题的定位流程：线程 dump、heap dump（MAT）、JFR、async-profiler、Arthas，以及 JMH 微基准测试。

## 闯关任务

**QUEST 11 · 第三章 生态**

- [ ] 能够按 CPU 高、内存泄漏 / OOM、线程卡死三类问题，说出各自的定位流程。
- [ ] 能够抓取并分析线程 dump，找出死锁和阻塞热点。
- [ ] 能够抓取 heap dump，并用 MAT 找到占用最大的对象和 GC Root 引用链。
- [ ] 能够用 JFR、async-profiler 采样并读懂火焰图，用 Arthas 在线诊断。
- [ ] 能够用 JMH 写出可信的微基准测试，并说出手写计时循环的常见陷阱。

**奖励**：+100 XP · 徽章「火焰图猎人」（徽章名暂定，内容建设中）

## 建议先收的资料

- 工具速查表
- 排障 Runbook
- 真实案例复盘笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】用 `jcmd` 打印线程 dump 的子命令是：
    - A. `GC.heap_info`
    - B. `Thread.print`
    - C. `VM.flags`
    - D. `JFR.check`
2. 【简答】怀疑内存泄漏时，用 MAT 分析 heap dump 应该重点看什么？
3. 【单选】火焰图中，哪个特征通常代表 CPU 热点？
    - A. 很高的栈
    - B. 顶部很宽的帧
    - C. 颜色最深的帧
    - D. 最左边的帧
4. 【简答】为什么不建议用 `System.nanoTime()` 包一个循环来做微基准测试？

<details markdown><summary>参考答案</summary>

1. B — `jcmd <pid> Thread.print`。
2. Dominator Tree 和 Retained Heap 大的对象，以及它们到 GC Root 的引用链（Leak Suspects 报告可作为起点）。
3. B — 宽度代表采样占比，顶部宽的帧就是自身耗 CPU 多的方法。
4. 会受 JIT 预热、死代码消除、常量折叠等影响，结果不可信；JMH 会处理预热、多次 fork 和 `Blackhole`。

</details>

---

← [上一节：持久层](../10-persistence/) · [返回 Java](../) · [下一节：生态与新趋势](../12-ecosystem-trends/) →
