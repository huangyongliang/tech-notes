# 并发 Concurrency

> [Java](../) › 并发

JMM 基础、`synchronized` / `volatile` / AQS / 锁、线程池、`CompletableFuture`，以及虚拟线程（JDK 21 正式发布，JEP 444）、结构化并发和 Scoped Values。重点比较线程池和虚拟线程的选型。

## 闯关任务

**QUEST 05 · 第二章 平台**

- [ ] 能够说明 `synchronized` 与 `volatile` 各自保证了什么（原子性、可见性、有序性）。
- [ ] 能够说出 AQS 在 `ReentrantLock`、`CountDownLatch` 等同步器中的作用。
- [ ] 能够根据任务类型配置线程池，并说出 `ThreadPoolExecutor` 核心参数的含义。
- [ ] 能够用 `CompletableFuture` 组合异步任务并处理异常。
- [ ] 能够比较线程池与虚拟线程（JEP 444，JDK 21 正式发布）的选型，并解释 pinning 问题及其在新版本中的变化。

**奖励**：+100 XP · 徽章「线程驯兽师」（徽章名暂定，内容建设中）

## 建议先收的资料

- JEP 444 及结构化并发相关 JEP
- 《Java Concurrency in Practice》要点
- 排障笔记（死锁、pinning）
- 示例代码

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】`volatile` 能保证的是：
    - A. 复合操作 `i++` 的原子性
    - B. 变量的可见性和禁止相关指令重排
    - C. 互斥访问
    - D. 死锁检测
2. 【单选】虚拟线程最适合哪类负载？
    - A. 大量阻塞等待 I/O 的任务
    - B. 长时间占满 CPU 的计算任务
    - C. 只有少量线程的批处理
    - D. GPU 计算
3. 【简答】什么是虚拟线程的 pinning？在 `synchronized` 中阻塞导致的 pinning 在哪个版本、由哪个 JEP 解决？
4. 【简答】为什么一般不建议把虚拟线程放进池里复用？
5. 【单选】`CompletableFuture` 中把两个独立异步结果合并的方法是：
    - A. `thenApply`
    - B. `thenCombine`
    - C. `thenAccept`
    - D. `exceptionally`

<details markdown><summary>参考答案</summary>

1. B — `volatile` 不保证复合操作的原子性。
2. A — 虚拟线程阻塞时会让出载体线程，适合高并发 I/O；CPU 密集任务没有收益。
3. 虚拟线程阻塞时无法从载体线程卸载，占住平台线程；`synchronized` 导致的 pinning 在 JDK 24 由 JEP 491 解决（JDK 21 LTS 上仍存在，JNI 等本地调用场景仍会 pinning）。
4. 虚拟线程创建成本很低，应该一任务一线程；需要限流时用 `Semaphore` 等手段控制并发数。
5. B — `thenCombine` 等两个结果都完成后合并。

</details>

---

← [上一节：输入输出](../04-io-nio/) · [返回 Java](../) · [下一节：Java 虚拟机](../06-jvm/) →
