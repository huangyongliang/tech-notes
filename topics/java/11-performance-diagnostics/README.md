# 性能与诊断 {#performance-diagnostics}

> [Java](../) › 性能与诊断

一次诊断或测量实际冻结、采样或记录了什么，决定它能回答哪一类问题，以及它什么时候不该作为第一件工具。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 06](../06-jvm/) 已经写明运行时区域和收集器目标。那里的 `jstat`、`jcmd`、Flight Recorder、JDK Mission Control 只表示能观察哪一类事实。`jstat` 手册仍注明该命令是实验性的、不受支持，本页不把它写成现行首选入口。调参、dump 和排障步骤在这里。[Java 09](../09-spring/) 的 Actuator 只提供观察面。[Java 10](../10-persistence/) 把慢查询和连接泄漏的排障交到这里，本页不另开数据库教程。虚拟线程的 pinning 见 [Java 05](../05-concurrency/)，本页只在线程 dump 能呈现哪些关系时回指。

面对 CPU 高、内存上涨或 OOM、线程卡住这三类问题，先问要回答的是哪一种事实，再选测量。工具名字不是入口。

## 先问要回答什么问题 {#_2}

CPU 高，要的是一段时间里谁在占用处理器。那是连续采样或带时间戳的事件，不是一张对象图。内存泄漏或 OOM，要的是谁还活着、被谁的引用链兜住。分配热点只能说明谁在造对象，不能单独证明谁泄漏。线程卡死或疑似死锁，要的是某一时刻的栈和锁状态。三类问题对不上的测量，从一开始就问错了。

## 线程 dump 是瞬时切片 {#thread-dump}

线程 dump 是某一时刻全部或所选线程的栈快照。它用来看线程在等什么、是否死锁、是否大量处于 `BLOCKED` 或 `WAITING`。它不告诉你过去一段时间里谁最耗 CPU，也不给出对象的保留大小。

抓取以 JDK 自带的 `jcmd` 为准。`jcmd <pid> Thread.print` 打印全部线程和栈，手册写明 Impact 为 Medium，随线程数变化。要落到文件、尤其要看虚拟线程之间的层次时，用 `Thread.dump_to_file`，`-format` 可以是 `plain` 或 `json`。JSON 形式是为虚拟线程引入的。结构化并发仍是预览，本页只写这种 dump 能呈现哪些线程关系，不教预览 API。`jstack` 不必再并列成现行入口。

一次 dump 是瞬时切片。短促的热点可能刚好不在这张切片上。它通常在安全点附近取得一致视图，因此本身也有开销，不是无代价的看一眼。

## Heap dump 冻结的是对象图 {#heap-dump}

Heap dump 是堆上对象图的一次冻结，用来回答哪些对象占用了内存、是谁的引用让它们无法回收。`jcmd GC.heap_dump` 的手册写明 Impact 为 High，代价随堆大小和内容变化；除非指定 `-all`，会先请求一次 Full GC。它不适合当作 CPU 问题的第一件工具，也不适合在生产上频繁抓。

Eclipse Memory Analyzer（MAT）看的是这份冻结图。Dominator Tree、Retained Heap、到 GC Root 的引用链，以及 Leak Suspects 报告，是读这张图的起点。Retained Heap 是去掉这个对象之后可以释放的那一块，不是对象自身的浅大小。适用条件是已经怀疑泄漏或堆过大，并且接受这次冻结和停顿。它不能告诉你分配速率随时间如何变化，也不能代替一段时间的分配采样。

正文里的稳定线是 MAT 1.17。独立包要求 Java 21。补丁号只出现在资料索引，不写成读者必须安装的唯一版本。

## JFR 记的是带时间戳的事件 {#jfr}

Flight Recorder 把运行时行为记成带时间戳的事件，可以在生产上持续收集、事后查看。JDK 25 的 `jdk.jfr` 包说明写明：事件有时间戳、持续时间和载荷，通常带应用自己的数据。可用 `jcmd` 在本机控制，或用 `FlightRecorderMXBean` 远程控制。这是连续记录，不是一次性冻结。

`jcmd JFR.start` 自带两种预设。`default.jfc` 开销低，可以用于持续记录。`profile.jfc` 数据更多、开销更大，只适合较短时间。`JFR.dump` 和 `JFR.start` 都可以带 `path-to-gc-roots`：转储时保存到 GC Root 的路径。手册写明这对找泄漏有用，但收集会让应用停顿一小段时间，只应在怀疑泄漏时打开。即便打开，它也不是 MAT 那种完整的 Dominator Tree 和 Retained Heap 分析。

JFR 能回答一段时间里的 CPU 采样、分配、锁、GC、I/O 等事件问题。它不能单独给出「这个对象为什么还在」的完整保留图。

把录音文件交给别人时，命令行、环境变量和系统属性可能还在里面。JEP 536 从 JDK 27 起让 JFR 在数据离开进程之前做进程内脱敏，默认会把命中过滤器的内容记成 `[REDACTED]`。这是 27 已交付的差异，不是 JDK 25 的默认行为。

JDK Mission Control 仍是查看录音的配套工具。正文只钉 JMC 9.x 这条产品线，不把未见正式发布说明的 10.x 写成当前默认。补丁标签放在资料索引。

## async-profiler 减轻安全点偏差 {#async-profiler}

async-profiler 是面向 HotSpot 的采样分析器。官方说明写明：它用 AsyncGetCallTrace 和 perf_events 做 CPU 与堆分配分析，并且不承受安全点偏差（Safepoint bias）。只在安全点采样的传统分析器，会系统性偏向刚好停在安全点的代码，漏掉安全点之间的热点。它还可以采到非 Java 线程，例如 GC 和 JIT，以及本地帧和内核帧。

火焰图里，宽度是该栈在采样中的占比。顶部宽的帧才是自身占用多的位置。高度是栈深，不是耗时。

它适合作为 CPU 高或分配热点的第一类连续测量，也可以和 JFR 记录配合。它仍然是采样，不是对象图，不能代替 MAT 的保留大小和引用链。

当前稳定版是 4.6。GitHub 页面上会先出现 nightly，那是预发布；旧分支上的维护补丁也不是这条稳定线。4.6 的说明里有对 JEP 401 值类分配的跟踪。那是对尚未进入任何 GA JDK 的预览方向做兼容，不能据此把值类写成已经交付。

## Arthas 对着活进程问 {#arthas}

Arthas 在已经运行的 JVM 上做在线诊断：不改源码、不重启，就可以观察类是否加载、反编译确认实际代码、看方法入参和调用栈、追踪慢调用、看线程和内存概要，也可以触发 profiler 或抓 dump。适用条件是问题正在发生，需要对着活进程问现在这段代码在干什么。

它不是一段时间的低开销事件记录，那是 JFR。它不是完整的对象图分析，需要时仍要 dump 再交给 MAT。它也不是微基准。附加到进程、部分命令会做字节码增强，有额外开销，也有误用风险。不能把它写成无代价、可替代一切。

官方 4.x 文档写明支持 JDK 8 及以上，并点名包括 JDK 25。正文里的稳定线是 4.3.x。补丁号放在资料索引。

## JMH 只比较隔离条件下的微实现 {#jmh}

Java Microbenchmark Harness 在隔离条件下测量一小段代码的开销。适用条件是：要比较的是微基准层面的实现差异，并且接受预热、多次 fork，以及必须避免死代码消除和常量折叠把测量对象优化掉。手写 `System.nanoTime()` 包一层循环，会受 JIT 预热不足、死代码消除和常量折叠影响，结果不可信。JMH 用预热迭代、独立 fork 和 `Blackhole` 处理这些陷阱。

JMH 不是生产排障工具，也不能证明线上某个接口慢的原因。一次测试证明了哪一层，见 [Java 08](../08-testing/)。本页不把微基准写成门禁。

OpenJDK Code Tools 页把源码仓库指向 `openjdk/jmh`。2026-11-13 打开的 Maven `org.openjdk.jmh:jmh-core` 元数据里，`latest` 与 `release` 都是 1.37，`lastUpdated` 为 2023-08-03。不得因为日期久就另写一个更新的正式版，也不得把 SNAPSHOT 写成当前默认。

## 它们怎么分工 {#division}

Dump 是瞬时冻结，冻的是栈或对象图。JFR 与 async-profiler 是连续测量，记的是事件或采样。Arthas 对着活进程做即时观察。JMH 是离线、隔离的微基准。

CPU 高：先 JFR 或 async-profiler，不要先 heap dump。泄漏或 OOM：需要对象图时用 heap dump 和 MAT；JFR 的分配事件和可选的 GC Root 路径只能作补充。卡住或死锁：先线程 dump。生产上要低开销盯着跑：优先考虑 JFR 的低开销预设，而不是反复 dump。要比较两段微实现：用 JMH，不要在线上用计时循环下结论。

## 常见误读 {#_3}

- 「CPU 高时先抓一份 heap dump。」对象图回答的是谁还活着。一段时间里谁占用处理器，要连续采样或事件记录。
- 「线程 dump 能看出谁最耗 CPU。」它是某一时刻的栈。短促热点可能不在这张切片上。
- 「火焰图里越高的栈越耗时。」宽度才是采样占比。高度是栈深。
- 「JFR 录音在 JDK 25 上默认就会把命令行打成 `[REDACTED]`。」进程内脱敏是 JEP 536，JDK 27 起才是默认。
- 「GitHub 上排在前面的 async-profiler nightly 就是当前稳定版。」稳定线是 4.6。nightly 和旧分支补丁都不是这条线。
- 「JMH 能解释线上接口为什么慢。」它只在隔离条件下比较一小段实现。

## 可选核对 {#perf-check}

问题类型和测量对象已经写在上面。这两问只核对它们。

1. 怀疑 CPU 高时，为什么不应把 heap dump 当作第一件工具？
2. 为什么不建议用 `System.nanoTime()` 包一个循环做微基准？

<details markdown><summary>参考答案</summary>

1. Heap dump 冻结的是对象图，回答谁还活着、被谁引用。CPU 高要的是一段时间里谁在占用处理器，那是 JFR 或 async-profiler 这一类连续采样或事件记录。线程 dump 同样是瞬时切片，也回答不了谁最耗 CPU。
2. 手写计时循环会受 JIT 预热不足、死代码消除和常量折叠影响。JMH 用预热迭代、独立 fork 和 `Blackhole` 处理这些陷阱。它仍然不是生产排障工具。

</details>

## 资料索引 {#_4}

- [JDK 25 `jcmd` 手册](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jcmd.html) — 2026-11-13：`Thread.print` 与 `Thread.dump_to_file` 的 Impact 为 Medium，后者 `-format` 为 `plain` 或 `json`。`GC.heap_dump` 的 Impact 为 High，除非 `-all` 会请求 Full GC。`JFR.start` 的 `default.jfc` 适合持续记录，`profile.jfc` 开销更大、只适合短时间。`JFR.dump` 与 `JFR.start` 的 `path-to-gc-roots` 对找泄漏有用，收集会让应用短暂停顿。
- [`jdk.jfr` 包说明（JDK 25）](https://docs.oracle.com/en/java/javase/25/docs/api/jdk.jfr/jdk/jfr/package-summary.html) — 事件有时间戳、持续时间和载荷。可用 `jcmd` 或 `FlightRecorderMXBean` 控制。
- [Java Flight Recorder API Programmer’s Guide（JDK 25）](https://docs.oracle.com/en/java/javase/25/jfapi/) — 同一套事件记录的编程说明。本页不展开 API。
- [JEP 536](https://openjdk.org/jeps/536) — JDK 27，Closed / Delivered。进程内脱敏，默认把命中过滤器的命令行、环境变量和系统属性记成 `[REDACTED]`。不是 JDK 25 的行为。
- [JDK Mission Control](https://www.oracle.com/java/technologies/jdk-mission-control.html) — 产品页仍以 JMC 9 的发行说明为入口。2026-11-13：`openjdk/jmc` 仓库标签最新的 GA 是 `9.1.2-ga`。不要把开发提交里的 10.0.0 写成已发布。
- [Eclipse MAT](https://eclipse.dev/mat/) 与 [下载页](https://eclipse.dev/mat/download/) — 2026-11-13：1.17.0，日期 2026-06-10。独立包最低 Java 21。正文只钉 1.17 这条线。
- [async-profiler](https://github.com/async-profiler/async-profiler) — README 写明稳定版 4.6，并用 AsyncGetCallTrace 与 perf_events，不承受安全点偏差。[v4.6](https://github.com/async-profiler/async-profiler/releases/tag/v4.6)（2026-10-19）含对 JEP 401 值类分配的跟踪。同页的 nightly 是预发布，不是稳定版。
- [Arthas 下载](https://arthas.aliyun.com/en/doc/download.html) 与 [4.3.5 发行说明](https://github.com/alibaba/arthas/releases/tag/arthas-all-4.3.5) — 2026-11-13：页面与 Maven `com.taobao.arthas:arthas-packaging` 的 `release` 都是 4.3.5（2026-08-31）。README 写明 4.x 支持 JDK 8+，包括 JDK 25。正文只钉 4.3.x。
- [OpenJDK JMH](https://openjdk.org/projects/code-tools/jmh/) — 正式版 1.37。Maven Central `org.openjdk.jmh:jmh-core` 的 `latest` / `release` 均为 1.37，`lastUpdated` 2023-08-03。
- [`jstat`](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jstat.html) — 实验性、不受支持。不是本页的首选入口。
- [Java 06](../06-jvm/) — 运行时区域和收集器目标。本页不重写。
- [Java 05](../05-concurrency/) — 虚拟线程与 pinning。结构化并发的预览纪律也在那里。
- [Java 09](../09-spring/) — Actuator 是观察面。
- [Java 10](../10-persistence/) — 慢查询和连接泄漏的排障交到本页。
- [Java 08](../08-testing/) — 一次测试证明了哪一层。JMH 不是那一课。

---

← [上一节：持久层](../10-persistence/) · [返回 Java](../) · [下一节：生态与新趋势](../12-ecosystem-trends/) →
