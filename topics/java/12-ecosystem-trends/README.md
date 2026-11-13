# 生态与新趋势 {#ecosystem-trends}

> [Java](../) › 生态与新趋势

这些方向各自要解决什么问题；到 2026-11-13 为止，哪些已经进入某个 GA JDK，哪些仍是预览、孵化或尚未随 GA 发行，不能写成当前默认。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 01](../01-language-basics/) 已经按 LTS 写过 Amber 已交付的语言特性，包括 `record`、`sealed`、模式匹配、文本块。本页不重讲写法。[Java 05](../05-concurrency/) 已经写明结构化并发在 JDK 27 仍是预览。本页不另开一节，也不教那个 API。[Java 09](../09-spring/) 写装配与 Actuator。Native Image 和 Spring AOT 的问题与前提在本页，不在 09 展开。[Java 06](../06-jvm/) 写收集器和 JIT 能观察的事实。Leyden 不改收集器语义，JEP 544 也不是那一页的 JIT 课。[Java 11](../11-performance-diagnostics/) 写测量告诉你什么。本页不讲怎么排障。

## Native Image 与 Spring AOT 不是同一件事 {#_2}

Native Image 在构建期对应用做静态可达性分析，提前编译成本地可执行文件。启动快，内存占用小，没有传统意义上的 JIT 预热，但构建慢。它在闭合世界假设下工作：分析是静态的，并不运行你的应用。构建时看不到的动态类加载、反射、资源、序列化、动态代理，运行时默认不在可执行文件里，必须用元数据或提示补全。Spring Boot 的说明还写明：应用的类路径在构建期固定，不能再变。这不是 HotSpot 的默认部署方式，也不是 JDK 25 发行版自带的默认工具链。

Spring AOT 在构建期检查 `ApplicationContext`，把本来会在运行时做的发现和决策提前做完。Framework 参考文档写明它会生成 Java 源码、通常用于动态代理的字节码，以及反射、资源加载、序列化和 JDK 代理的 `RuntimeHints`。Boot 的 Native Image 说明再把这些提示落到 JSON，其中包括 JNI。它解决的是 Spring 应用的动态装配与闭合世界冲突这一层，不是 Native Image 本身。

同一份文档写明：AOT 目前的重点是让 Spring 应用能以 GraalVM Native Image 部署，也可以用 `spring.aot.enabled=true` 在 JVM 上启用 AOT 优化。一旦启用，构建期已经做出的决定会被写死，例如构建期打开的 profile 在运行时也会被打开。影响 Bean 是否存在的条件，要在构建期选定。不要写成上了 AOT 就一定更快，也不要把 AOT 和 Native Image 写成同一件事。

版本要分成两层。独立产品线在 2026-11-13 的当前功能发行是 GraalVM 25.5，补丁号在资料索引；下一功能发行 25.6 计划 2026-11-24，当日尚未发布。Oracle Java SE Support Roadmap（页面仍标注 Updated October 20, 2026）写明：GraalVM for JDK 24 是最后一个作为 Oracle Java SE Products 的一部分获得许可和支持的 GraalVM 版本，并鼓励把相关工作负载转到 Oracle JDK。这说的是 Java SE 产品包内的支持结束，不是 GraalVM 项目停更。不要写成「GraalVM 已经停止」，也不要写成「Oracle JDK 25 默认就是 Native Image」。

## 值对象还没有进入任何 GA JDK {#valhalla}

Valhalla 要解决的是：不可变数据往往不需要对象身份，却仍被当作有身份的对象来分配和寻址，从而带来指针、局部性差和多余的分配。值对象取消身份，让 `==` 比较字段值，并使 JVM 有空间做更紧凑的编码。这是语言和 VM 的模型变化，不是新的 GC。口号若说成「像 class 一样编码、像 int 一样工作」，那是目标，不是当前发行版里已经发生的事。

到 2026-11-13，值对象尚未进入任何 GA JDK。JEP 401（Value Objects，Preview）状态是 Integrated，已定向到 JDK 28。JEP 539（Strict Field Initialization in the JVM，Preview）同样已集成并列入 JDK 28。项目页在 2026-08 写明二者将包含在 JDK 28 中，并请人用 JDK 28 早期访问构建试用。JDK 28 计划 2027-03-09 才 GA，不是当前默认。即便将来随 28 发布，JEP 401 仍写明这是预览语言和 VM 特性，默认关闭，要用 `--enable-preview`。更后的空值受限存储、参数化 JVM 等仍是项目内后续特性集，不得提前写成即将默认。

## FFM API 已经在 JDK 22 交付 {#ffm}

Foreign Function & Memory API 让 Java 程序用纯 Java API 调用本地函数，并访问受生命周期约束的本地内存，用来替代 JNI 那套脆弱的本地胶水。JEP 454 状态是 Closed / Delivered，发行版是 JDK 22，API 在 `java.base` 的 `java.lang.foreign`。因此它已经在 JDK 25 教学基线里，不是预览。

核心抽象是 `MemorySegment`、`Arena`（分配与生命周期），`MemoryLayout`、`VarHandle`（结构化访问），以及 `Linker`、`SymbolLookup`、`FunctionDescriptor`（向下调用和向上回调）。受限方法默认会警告。`Linker.downcallHandle` 属于这一类，需要 `--enable-native-access`，或可执行 JAR 清单里的 `Enable-Native-Access`，才能无警告使用。不得写成和普通 Java 调用一样无约束。

JEP 454 的非目标包括：不在这个 API 里提供从头文件机械生成绑定的工具。`jextract` 依赖 FFM，但是 Panama 的独立组件，不要写成 FFM 正式化时已经内置进 JDK 的默认命令。

Vector API 同属 Panama，但在 JDK 27 仍是 JEP 537 的第十二次孵化。不得与已经正式化的 FFM 写成同一状态。

## Leyden 按发行版拆开 {#leyden}

Leyden 要解决的是：HotSpot 每次启动都要加载、链接、剖析、再 JIT，启动和预热慢。做法是把一部分工作前移到训练运行，结果放进 AOT 缓存，供后续生产运行立刻使用，同时保留 HotSpot 和动态特性：动态类加载、剖析、必要时再 JIT。这与 Native Image 在闭合世界里生成独立本地可执行文件不是同一条路。

不能把 Leyden 整包写成尚未到来，也不能写成已经全部交付。按 2026-11-13 打开的项目页和 JEP 拆开：

- 已经在 GA JDK 里：JEP 483 提前加载与链接（JDK 24）；JEP 514 用 `-XX:AOTCacheOutput` 一步完成训练并生成缓存（JDK 25）；JEP 515 提前方法剖析，让生产运行一开始就有剖析数据（JDK 25）；JEP 516 与任意 GC（含 ZGC）一起使用的对象缓存（JDK 26）。
- 对教学基线 JDK 25 LTS：483、514、515 已经可用。516 从 26 起才交付。27 作为更新的功能发行也包含 516，但不要把它写成 25 LTS 里已有的行为。
- 仍等 JDK 28：JEP 544 把训练运行里编译好的本地代码放进 AOT 缓存。状态是 Completed，Release 28。Completed 不等于已经随某个 GA 发行版交付。JDK 28 计划 2027-03-09 才 GA。不得把 JEP 544 写成 25 或 27 的默认，也不得因为状态字是 Completed 就写成读者今天就能在 25 或 27 上当作现行功能使用。

## Amber 只跟踪哪些已经进入平台 {#amber}

Amber 做的是较小的、面向生产力的语言特性。用法回链 Java 01。本页只区分哪些已经是平台的一部分，哪些仍要预览或尚未立项到某发行版。

已经交付、本页不展开的包括：`var`（JEP 286）、文本块（378）、`instanceof` 模式匹配（394）、`record`（395）、`sealed`（409）、`switch` 模式匹配（441）、record 模式（440）、未命名变量与模式（456）、紧凑源文件与实例 main（512，JDK 25）、模块导入（511，JDK 25）、灵活的构造器体（513，JDK 25）。

仍是预览、不得写成默认：JEP 532 是 JDK 27 上原始类型进入模式、`instanceof` 和 `switch` 的第五次预览。状态是 Closed / Delivered，交付的是预览特性，仍须 `--enable-preview`。尚未进入某发行版：JEP 468 Derived Record Creation 状态仍是 Candidate。已撤回的字符串模板（JEP 465）不是现行方向。

## 版本纪律 {#version-discipline}

> [!WARNING]
> 主题首页的版本基线仍是：最新 LTS 为 JDK 25，最新功能版本为 JDK 27。本页可以写 27 上已经交付的差异，也可以写已经定向到 JDK 28、但 28 尚未 GA 的项目。这些句子都不是要求去改首页那张表。预览、孵化、Candidate，以及 Integrated 或 Completed 但宿主发行版尚未 GA 的项，都不是当前默认。

结构化并发不在本页展开。JEP 533 是 JDK 27 的第七次预览，默认关闭，不是平台保证。JEP 543 提议在 JDK 28 定稿，状态是 Integrated；28 计划 2027-03-09 才 GA。纪律以 [Java 05](../05-concurrency/) 已经写明的为准。

## 常见误读 {#_3}

- 「Native Image 就是 Spring AOT。」AOT 在构建期固化装配并生成提示。Native Image 才是闭合世界下的本地可执行文件。
- 「GraalVM 已经停止，所以 Oracle JDK 25 默认就是 Native Image。」停的是 Java SE 产品包里的 GraalVM 支持，停在 GraalVM for JDK 24。独立产品线仍在发 25.5。JDK 25 的默认运行时仍是 HotSpot。
- 「JEP 401 已经集成进 JDK 28，所以值对象已经交付。」28 尚未 GA。即便随 28 发布，它仍是预览，默认关闭。
- 「JEP 544 的状态是 Completed，所以 Leyden 的 AOT 代码编译今天就能在 JDK 25 上用。」Completed 绑定的是尚未 GA 的 JDK 28。25 里有的是 483、514、515，不是 516，也不是 544。
- 「FFM 和 Vector API 都已经正式化。」FFM 在 JDK 22 交付。Vector API 在 JDK 27 仍是第十二次孵化。

## 可选核对 {#trend-check}

闭合世界和启动路径已经写在上面。这两问只核对它们。

1. 为什么 Native Image 下反射和动态代理通常需要额外配置？Spring AOT 在其中做了哪一层？
2. Leyden 与 Native Image 在缩短启动时，各自保留或放弃了什么？

<details markdown><summary>参考答案</summary>

1. Native Image 的分析是静态的，并不运行应用。构建时看不到的反射、动态代理、资源和序列化，默认不在可执行文件里，类路径也在构建期固定。Spring AOT 在构建期检查 `ApplicationContext`，生成源码、代理字节码和 `RuntimeHints`，用来补上这一层提示。它不是 Native Image 本身。
2. Leyden 仍跑在 HotSpot 上，用训练运行产生的 AOT 缓存缩短启动和预热，并保留动态类加载和必要时的再 JIT。Native Image 在闭合世界里生成独立本地可执行文件，放弃传统的 JIT 预热，也放弃构建时看不见的动态行为。JDK 25 里 Leyden 已有的是提前加载链接、命令行一步生成缓存和提前剖析；对象缓存从 26 起，AOT 代码编译还在等尚未 GA 的 JDK 28。

</details>

## 资料索引 {#_4}

- [GraalVM Native Image](https://www.graalvm.org/latest/reference-manual/native-image/) — 2026-11-13：构建在闭合世界假设下进行。分析是静态的，并不运行应用。
- [Spring Boot：Introducing GraalVM Native Images](https://docs.spring.io/spring-boot/reference/packaging/native-image/introducing-graalvm-native-images.html) — 必须告知反射、资源、序列化和动态代理。类路径在构建期固定。生成的提示包括 `reflect-config.json` 与 `jni-config.json`。
- [Spring Framework AOT](https://docs.spring.io/spring-framework/reference/core/aot.html) — 生成源码、代理字节码，以及反射、资源、序列化和 JDK 代理的 `RuntimeHints`。重点是 Native Image 部署。`spring.aot.enabled=true` 可在 JVM 上启用，构建期决定会被写死，包括当时打开的 profile。
- [GraalVM 发行日历](https://www.graalvm.org/release-calendar/) — 2026-11-13：当前功能发行是 2026-11-03 的 25.5.5.0.3（Oracle 与 Community Edition）。25.6.5.1 计划 2026-11-24，当日尚未发布。正文只钉 25.5。
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) — 页面标注 Updated October 20, 2026。25 为现行 LTS，27 为当前功能发行，28 计划 2027-03，下一个计划中的 LTS 是 29（2027-09）。GraalVM for JDK 24 是最后一个作为 Java SE Products 一部分获得许可和支持的 GraalVM 版本。
- [Project Valhalla](https://openjdk.org/projects/valhalla/) 与 [JEP 401](https://openjdk.org/jeps/401) — 2026-08：JEP 401 与 JEP 539 已集成并将包含在 JDK 28。JEP 401 状态 Integrated，Release 28，预览特性，默认关闭。
- [JEP 454](https://openjdk.org/jeps/454) 与 [Project Panama](https://openjdk.org/projects/panama/) — FFM API，Closed / Delivered，JDK 22，包 `java.lang.foreign`。非目标包括从头文件机械生成绑定。`jextract` 不在这次交付里。
- [JEP 537](https://openjdk.org/jeps/537) — Vector API，JDK 27 的第十二次孵化。不是 FFM 的状态。
- [Project Leyden](https://openjdk.org/projects/leyden/) — 进行中的是 JEP 544（JDK 28）。已交付 483（24）、514（25）、515（25）、516（26）。
- [JEP 483](https://openjdk.org/jeps/483)、[JEP 514](https://openjdk.org/jeps/514)、[JEP 515](https://openjdk.org/jeps/515)、[JEP 516](https://openjdk.org/jeps/516)、[JEP 544](https://openjdk.org/jeps/544) — 483 / 514 / 515 / 516 为 Closed / Delivered，发行版分别是 24、25、25、26。514 增加 `-XX:AOTCacheOutput`。544 状态 Completed，Release 28，页面 Updated 2026/11/11。28 尚未 GA。
- [Project Amber](https://openjdk.org/projects/amber/) — 已交付的语言特性回链 Java 01。进行中的包括原始类型模式和 JEP 468。
- [JEP 532](https://openjdk.org/jeps/532) — JDK 27 第五次预览，Closed / Delivered，仍须 `--enable-preview`。
- [JEP 468](https://openjdk.org/jeps/468) — Derived Record Creation，状态 Candidate。尚未进入某发行版。
- [JDK 项目发行列表](https://openjdk.org/projects/jdk/)、[JDK 27](https://openjdk.org/projects/jdk/27/)、[JDK 28](https://openjdk.org/projects/jdk/28/) — 2026-11-13：27 于 2026-09-15 GA；28 仍在开发，GA 计划 2027-03-09。28 已定向的特性包括 JEP 401、543、544，都还不是当前平台保证。
- [JEP 533](https://openjdk.org/jeps/533) 与 [JEP 543](https://openjdk.org/jeps/543) — 533 是 JDK 27 的第七次预览。543 状态 Integrated，提议在 JDK 28 定稿。API 与纪律见 Java 05，本页不展开。
- [Java 01](../01-language-basics/) — 已交付的 Amber 语法。
- [Java 05](../05-concurrency/) — 结构化并发仍是预览。
- [Java 06](../06-jvm/) — 收集器与可观察的运行时事实。Leyden 不改那份合同。
- [Java 09](../09-spring/) — 装配与 Actuator。AOT 与 Native Image 不在那一页展开。
- [Java 11](../11-performance-diagnostics/) — 测量告诉你什么。本页不写排障步骤。

---

← [上一节：性能与诊断](../11-performance-diagnostics/) · [返回 Java](../)
