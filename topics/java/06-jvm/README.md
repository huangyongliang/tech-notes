# Java 虚拟机 {#java-jvm}

> [Java](../) › Java 虚拟机

虚拟机安放存储、装入类、回收内存，并实现语言合同。它不改写 happens-before，也不把某种收集器写成唯一正确的选择。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 05](../05-concurrency/) 写 Java 怎样建立 happens-before。[编程 04](../../programming/04-evaluation-memory/) 写这条边的语言定义，以及垃圾回收不建立它。本页不重讲这些规则，只写虚拟机怎样安放存储、装入类和回收内存，从而实现那份合同。调参、dump 和排障步骤留给 [Java 11](../11-performance-diagnostics/)。工具在这里只表示「能观察哪一类事实」。

## 谁能看见这块存储 {#_2}

JVMS 把运行时数据分成几块，并写明哪些按线程分开。每条线程有自己的程序计数器，也有私有的 Java 虚拟机栈。本地方法栈若被实现提供，通常在创建线程时按线程分配。堆是所有线程共享的。方法区也是共享的。`jstat` 的分代统计里会单独报出 metaspace，它不是每条线程的栈。

这条分界回答的是「谁能看见这块存储」。线程私有的栈帧，别的线程没有这条栈可走。堆上的对象可以被多个线程的引用指到。它不回答「一次写入是否已经 happens-before 于另一次读」。共享堆只说明引用能够到达。看见最新的写入，仍要靠 Java 05 里的那些边。

## 先问父加载器 {#class-loading}

类加载在 JVMS 里是：由某个定义加载器创建类。平台加载器的默认策略写在 `ClassLoader.loadClass`：先请父加载器尝试，父加载器不能加载时，才由自己定义。这使核心类不会被同名类型悄悄换掉，也避免同一类型被互不相关的加载器各定义成一个看起来同名、实际上不同的类。

这是可被打破的约定，不是改不了的字节码规则。服务发现或 JDBC 往往要由调用方的加载器去找实现；一个容器里各应用也要各自的加载器，才能让同名类互不覆盖。那些地方打破双亲委派，是因为父加载器看不见应用自己的类，或者不该让应用类污染核心加载器。本页只点到「为何要打破」，不写容器怎么配。

## 收集器的目标，不是广告 {#collectors}

垃圾回收实现的是「不再可达的对象可以回收」。它不建立 happens-before。选收集器，选的是停顿、吞吐和足迹之间的目标，不是语言语义。

G1 原先是服务器环境的默认收集器。自 JDK 27 起，JEP 523 让它在所有环境里成为默认。JDK 25 这个长期支持版还没有这条改动。

ZGC 要保住的性质写在 JEP 439 里：停顿不超过 1 毫秒，并支持从几百 MB 到数 TB 的堆。分代模式自 JDK 21 由 JEP 439 引入，JDK 23 起由 JEP 474 成为 ZGC 的默认，非分代模式在 JDK 24 由 JEP 490 移除。

Shenandoah 把回收对象的转移和 Java 线程同时做，JEP 189 写明停顿不随堆大小改变。分代模式在 JDK 25 已是正式产品特性，JEP 521 写明这不是改默认：默认仍是单代。把默认改成分代的 JEP 535 面向 JDK 28，状态是 Targeted，JDK 28 尚未 GA。不得把 JEP 535 写成当前默认。

JIT 把热点字节码编译成本地代码并做优化。它缩短的是反复执行的路径。语言合同不变：同一份 happens-before 在解释执行和编译之后仍然成立。

## 工具观察哪一类事实 {#jvm-tools}

`jstat` 按给定的间隔采样虚拟机统计，`-gc` 一类选项给出各代占用，其中也包括 metaspace。手册注明这条命令是实验性的、不受支持。`jcmd` 向正在运行的虚拟机发送诊断命令。Flight Recorder 把数据记成带时间戳的事件。JDK Mission Control 和它配成一条持续收集、事后查看的工具链。命令怎么敲、dump 怎么分析、参数怎么调，都在 Java 11。

## 常见误读 {#_3}

- 「堆是共享的，所以写入自然对别的线程可见。」共享只说明别的线程可以持有引用。可见性仍是 happens-before 的事。
- 「双亲委派是虚拟机改不了的铁律。」它是 `ClassLoader.loadClass` 的默认策略。服务发现和容器加载器会在理由充分时打破它。
- 「JDK 25 上 G1 已经是所有环境的默认。」全部环境的默认是 JDK 27 的 JEP 523。25 仍是服务端默认这一层。
- 「分代 Shenandoah 在 JDK 25 已是默认。」JEP 521 把它做成产品特性，并写明默认仍是单代。JEP 535 还没随 JDK 28 正式发布。

## 可选核对 {#jvm-check}

区域和加载顺序已经写在上面。这两问只核对它们。

1. 程序计数器、虚拟机栈、本地方法栈和堆里，哪一块是线程共享的？
2. 双亲委派的顺序是什么？它要防止什么？

<details markdown><summary>参考答案</summary>

1. 堆是线程共享的。程序计数器和虚拟机栈是每条线程自己的。本地方法栈若被实现提供，通常也按线程分配。题面四块里，规范写明由所有线程共享的是堆。
2. 先请父加载器尝试，父加载器不能加载时才由自己定义。它防止核心类被同名类型换掉，也避免同一类型被互不相关的加载器各定义一次。这个默认策略是可以打破的。

</details>

## 资料索引 {#_4}

- [JVMS 2.5：Run-Time Data Areas（JDK 25）](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html#jvms-2.5) — 每条线程有自己的程序计数器和私有的虚拟机栈。本地方法栈若提供，通常按线程分配。堆和方法区由所有线程共享。
- [JVMS 5.3：Creation and Loading](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.3) — 类由定义加载器创建。双亲委派本身不是这条规则。
- [`ClassLoader`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ClassLoader.html) — `loadClass` 的默认策略是先委派父加载器。自定义加载器可以不这么做。
- [JEP 523](https://openjdk.org/jeps/523) — JDK 27，Closed / Delivered。G1 成为所有环境的默认收集器。
- [JEP 189](https://openjdk.org/jeps/189) — Shenandoah，Closed / Delivered，Release 12。停顿不随堆大小改变。
- [JEP 439](https://openjdk.org/jeps/439) — JDK 21，分代 ZGC。要保住的性质包括停顿不超过 1 毫秒，以及从几百 MB 到数 TB 的堆。
- [JEP 474](https://openjdk.org/jeps/474) — JDK 23，分代模式成为 ZGC 默认。
- [JEP 490](https://openjdk.org/jeps/490) — JDK 24，移除非分代 ZGC。
- [JEP 521](https://openjdk.org/jeps/521) — JDK 25，分代 Shenandoah 成为产品特性，默认仍是单代。
- [JEP 535](https://openjdk.org/jeps/535) — 状态 Targeted，Release 28，尚未 GA。不得写成当前默认。
- [Java 05](../05-concurrency/) — happens-before 的 Java 建边方式。本页不重讲。
- [编程 04](../../programming/04-evaluation-memory/) — 垃圾回收不建立 happens-before。
- [`jstat`](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jstat.html) — 按间隔采样各代占用，含 metaspace。手册注明该命令是实验性的、不受支持。
- [`jcmd`](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jcmd.html) — 向正在运行的虚拟机发送诊断命令。
- [`jdk.jfr`](https://docs.oracle.com/en/java/javase/25/docs/api/jdk.jfr/jdk/jfr/package-summary.html) — Flight Recorder 把数据记成带时间戳的事件。
- [JDK Mission Control](https://www.oracle.com/java/technologies/jdk-mission-control.html) — 与 Flight Recorder 配成持续收集、事后查看的工具链。操作步骤在 Java 11。
- [Java 11](../11-performance-diagnostics/) — 排障和调参。本页只点名工具观察哪一类事实。

---

← [上一节：并发](../05-concurrency/) · [返回 Java](../) · [下一节：构建工具](../07-build-tools/) →
