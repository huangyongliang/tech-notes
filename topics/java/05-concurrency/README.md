# 并发 {#concurrency}

> [Java](../) › 并发

没有 happens-before 的冲突访问仍是数据竞争。Java 用监视器、`volatile` 以及线程的启动和汇合把这些边建起来；虚拟线程改变的是阻塞任务要不要占住一条平台线程。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[编程 04](../../programming/04-evaluation-memory/) 已经写明：没有 happens-before 的冲突访问是数据竞争，垃圾回收不建立这条边。本页不重讲那个定义，只写 Java 程序里常见的建边方式，以及任务怎样被调度。[Java 04](../04-io-nio/) 写一次调用会不会占住线程。虚拟线程适合的，是那里那种会阻塞等待的任务。[Java 06](../06-jvm/) 写运行时怎样安放存储和编译热点。它实现这些合同，不在本页重讲。

## 监视器、volatile，以及启动和汇合 {#_2}

`synchronized` 进入和退出监视器，同时做两件事：同一时刻只有一个线程留在临界区里，并且这个进出建立 happens-before。后面的线程获得同一把锁时，能看见前面持锁线程在释放前的写入。

`volatile` 写和之后对同一变量的读也建立 happens-before。它保证这个变量的可见性，并约束与这次读写相关的重排。它不保证复合动作的原子性。`i++` 是读、加、写三步。两次 `volatile` 的 `i++` 仍可能交错，结果少加一次。要原子性，得用监视器把三步包进同一临界区，或用类库里的原子变量。原子变量的方法表不在本页。

线程 `start` 建立从启动动作到该线程第一条动作的 happens-before。`join` 建立从被等待线程的结束到 `join` 返回之后的 happens-before。这是 JLS 17.4 里的边，不是「开了线程就自然可见」。

## 平台线程的池，和两个结果何时合并 {#pools}

`ThreadPoolExecutor` 的核心线程数、最大线程数、队列和空闲存活时间，描述的是平台线程占多少、多余任务排到哪里。这是平台线程的资源合同，不是虚拟线程的默认用法。

许多同步器共用 `AbstractQueuedSynchronizer` 这套框架：阻塞锁和信号量一类工具，把等待放进同一个先进先出的队列。本页只到这一句，不拆 `ReentrantLock` 的源码。

`CompletableFuture.thenCombine` 把两个独立计算的结果合并：两边都正常完成之后，合并函数才运行。它不表示两个任务互相建立了监视器那条边。可见性仍要靠任务结束与取得结果之间的完成关系，而不是靠方法名字。

## 虚拟线程卸得下载体，才有规模 {#virtual-threads}

虚拟线程由 JDK 调度，执行时挂到一条平台线程上，那条平台线程是它的载体。阻塞操作可以让虚拟线程从载体卸下，载体就能去运行别的虚拟线程。因此大量会阻塞等待 I/O 的任务不必各占一条平台线程。长时间占满 CPU 的计算不会在阻塞点卸下，就没有这条收益。

虚拟线程创建成本低，一般一任务一条，不要放进池里复用。要限制同时进行的任务数，用信号量一类的许可，而不是用池的大小去模拟。

卸不下载体时，虚拟线程会占住那条平台线程，这叫 pinning。在 JDK 21 上，虚拟线程在 `synchronized` 里阻塞，卸不下来，载体一直被占着。JDK 24 的 JEP 491 改了监视器的实现：在 `synchronized` 方法或语句里阻塞，以及在监视器上等待，绝大多数情况下会卸下载体。JDK 21 这个长期支持版没有这处改动，那里的 pinning 仍在。

JEP 491 没有写成「24 以后再无 pinning」。剩下的情形包括：本地方法或外部函数与内存接口进入本地代码后，又回调 Java 并在那里阻塞或等待监视器；解析符号引用时阻塞在类加载上；在类初始化里阻塞；等待另一个线程完成类初始化。这些仍会占住载体。落笔时以该 JEP 的 Future Work 和诊断一节为准。

## 作用域值和仍是预览的结构化并发 {#scoped-preview}

JEP 506 在 JDK 25 正式交付作用域值。它把不可变数据交给同一线程里的被调用者，也可以交给子线程。作用域结束，这份绑定就结束。`ThreadLocal` 则是线程上的一份可变槽，通常活到线程结束或被显式去掉。差别只在可变性和生命周期。作用域值不是新的全局变量。

结构化并发仍是预览：JEP 533 是 JDK 27 的第七次预览，预览 API 不是 JDK 25 或 27 的平台保证。JEP 543 的状态是 Integrated，目标版本是 JDK 28，而 JDK 28 计划 2027/03/09 才 GA。本页不教这些预览 API，也不把它们写成已经交付的平台特性。

## 常见误读 {#_3}

- 「`volatile` 让 `i++` 变成原子的。」它只约束这一变量的可见性和相关重排。读改写仍是三步。
- 「垃圾回收会把写入变得可见。」编程 04 已经分开：回收不建立 happens-before。
- 「虚拟线程应该放进池里，和平台线程一样。」创建便宜，一任务一条。池的核心参数描述的是平台线程。
- 「JDK 24 之后虚拟线程不再 pinning。」`synchronized` 里的阻塞在 24 起大多可以卸下。本地帧和类加载仍可能占住载体。JDK 21 上连 `synchronized` 的那种 pinning 都还在。

## 可选核对 {#concurrency-check}

建边和 pinning 的版本差已经写在上面。这两问只核对它们。

1. 把 `i` 声明为 `volatile`，两个线程同时执行 `i++`。这是否原子？
2. 在 JDK 21 和 JDK 24 及以后，虚拟线程在 `synchronized` 里阻塞，是否仍会钉在载体线程上？

<details markdown><summary>参考答案</summary>

1. 不是。`volatile` 不把读、加、写包成一个原子动作。两次递增仍可能交错。
2. JDK 21 会。JDK 24 起，JEP 491 让这种监视器上的阻塞在绝大多数情况下卸下载体。本地回调和类加载等剩余情形里，pinning 仍然存在。不能写成 24 以后完全没有。

</details>

## 资料索引 {#_4}

- [JLS 17.4：Memory Model（JDK 25）](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4) — happens-before 的定义。监视器的解锁先于之后对同一监视器的加锁；`volatile` 写先于之后对同一变量的读；`start` 先于新线程里的动作；线程里的动作先于其他线程从 `join` 成功返回。
- [编程 04](../../programming/04-evaluation-memory/) — 数据竞争和「垃圾回收不建立 happens-before」。本页只补 Java 的建边方式。
- [`ThreadPoolExecutor`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html) — 核心线程数、最大线程数、队列和空闲存活时间，是平台线程的占用和排队合同。
- [`AbstractQueuedSynchronizer`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html) — 阻塞锁和相关同步器共用的等待队列框架。
- [`CompletableFuture`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CompletableFuture.html) — `thenCombine` 在两个独立结果都完成后合并。
- [JEP 444](https://openjdk.org/jeps/444) — 虚拟线程，JDK 21，Closed / Delivered。阻塞任务不必各占一条平台线程。创建便宜，一般不放进池里复用。
- [JEP 491](https://openjdk.org/jeps/491) — JDK 24，Closed / Delivered。`synchronized` 内阻塞在绝大多数情况下不再 pinning。Future Work 列出类加载和类初始化等剩余情形；诊断一节写明本地方法或外部函数回调后再阻塞仍会 pinning。
- [JEP 506](https://openjdk.org/jeps/506) — 作用域值，JDK 25，Closed / Delivered。不可变，生命周期随作用域结束。
- [JEP 533](https://openjdk.org/jeps/533) — 结构化并发，JDK 27 的第七次预览。不是 25 或 27 的平台保证。本页不教该 API。
- [JEP 543](https://openjdk.org/jeps/543) — 状态 Integrated，Release 28。JDK 28 尚未 GA，不得写成已交付。
- [Java 04](../04-io-nio/) — 阻塞等待和 `sendAsync`。
- [Java 06](../06-jvm/) — 运行时实现这些合同，不重讲 happens-before 的定义。

---

← [上一节：输入输出](../04-io-nio/) · [返回 Java](../) · [下一节：Java 虚拟机](../06-jvm/) →
