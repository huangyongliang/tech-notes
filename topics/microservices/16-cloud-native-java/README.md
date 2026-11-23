# 性能与云原生 Java {#java-performance-cloud-native-java}

> [微服务](../) › 性能与云原生 Java

冷启动、预热、常驻内存和阻塞并发是不同的瓶颈。原生镜像、CRaC、AOT 缓存和虚拟线程各自只改变其中一段。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[并发](../../java/05-concurrency/) 写了虚拟线程的调度、不池化、信号量和 JEP 491 之后仍然存在的 pinning。[生态与新趋势](../../java/12-ecosystem-trends/) 写了 Native Image、Spring AOT 的闭合世界、profile 固化和 Leyden 的阶段。[性能与诊断](../../java/11-performance-diagnostics/) 写测量。本页只把这些合同带到微服务实例扩缩时的部署选择，不重写那三章，也不排 Graal 或 JVM 的名次。资源配额在 [12](../12-containers-k8s/)，不同运行形态要在 [15](../15-testing/) 里重跑关键行为，APM 是否还可用回 [10](../10-observability/)。

## 先分清启动、预热、内存与等待 {#_2}

在同一应用、相同 CPU 和内存限制下，分开测：进程启动、readiness、第一个成功请求、稳态吞吐和延迟、RSS，以及构建成本。冷启动快，不等于稳态吞吐高。虚拟线程改善的是阻塞等待时的并发，不是冷启动技术。本页不编造加速倍数，也没有公司实测。

## GraalVM 原生镜像把哪些决定前移 {#graalvm}

原生镜像在构建期决定能到达的代码。反射、动态代理和资源需要提示，否则运行时找不到。Spring AOT 在构建期处理应用上下文，它本身不是 Native Image。运行时 profile 和类路径限制回 Java 12。

2026-11-23 的 GraalVM Community 标签仍是 **`graal-25.5.5.0.3`**（Innovation 5，GitHub `published_at` 2026-11-03T14:43:07Z）。发行资产名是 `graalvm-community-jdk-25i5-25.0.5.0.3_...`。[25.5 发行说明](https://www.graalvm.org/release-notes/25.5/) 写明 Community Edition 25.5.5.0.3 基于 OpenJDK **25.0.5.0.3**。原页只写 25.0.5，这里补上发行说明里的完整基底，不是另一条产品线。

[发行日历](https://www.graalvm.org/release-calendar/) 的下一档 Feature 是 2026-11-24 的 25.6.0。本次核验日是 2026-11-23，25.6 尚未到日历上的日期，不能写成已发布。2026-11-17 的 CSPU 列的是 Oracle 25.0.5.1，Community 列是「-」。不要把这档 Oracle 更新写成 CE 的新 Innovation。

下面的命令是 Maven 的 native 构建路径，原样保留。它需要工程里已经配置 native 插件和 profile，并且环境里有对应的 GraalVM 工具链。命令未执行。命令没报错，也不等于兼容测试已经通过。本页不新增插件版本号。

```bash
# Spring Boot 原生镜像（示意，未执行）
./mvnw -Pnative native:compile
```

## CRaC 保存热状态，也保存资源责任 {#crac}

路径是：先预热，在 checkpoint 之前关闭或协调资源，做检查点，restore 之后重建，并重新读取会变的环境。网络连接、数据库池、文件句柄、时间、随机状态、凭证和实例身份都要有明确的生命周期。不能在恢复后继续用旧 socket。检查点里可能有敏感数据，要按制品保护。快照不是一张无状态的容器镜像。

OpenJDK CRaC 是一个项目，不是 JDK 25 标准库里默认就带的完整 restore 引擎。[项目页](https://openjdk.org/projects/crac/) 没有独立发行日。`org.crac:crac` **1.5.0** 的 API 可以编译，也可以在没有宿主时走模拟；Maven metadata 的 `lastUpdated` 是 2024-06-19，本文不把它写成精确发行日。`Core` 在宿主不支持时可以抛出 `UnsupportedOperationException`。API 能编译，不等于 checkpoint 或 restore 已经成功。

Azul 的 CRaC 说明写明：真实 CRaC 目前只在它列出的 Linux 上可用；开发时可以在其他平台用 CRaC Java library 做模拟。2026-11-17 的发行说明是另一份月度更新，文本抽取没有给出完整的 major × 操作系统 × 架构勾选，本页不报 Azul 包号。BellSoft 的产品页写了 Liberica JDK with CRaC，并提到 Java 17 和 21，同时要求兼容的 Linux。那一页不是当前全部 major 和补丁的下载矩阵，本页不把 17/21 写成唯一完整列表，也不从普通 Liberica 25.0.5.1 推导出有 25 的 CRaC 包。

下面的类只演示回调合同。`closeConnections` 和 `reopenConnections` 是集成点，空实现不能当成恢复成功。持有真实资源的组件应保住生命周期引用，并只注册一次。2026-11-23 用 JDK 25.0.5.1（Temurin 25.0.5.1+2）对 `org.crac:crac:1.5.0` 编译通过。没有 CRaC 宿主，没有做 checkpoint，也没有做 restore。

```java
import org.crac.Context;
import org.crac.Core;
import org.crac.Resource;

abstract class LeaveResources implements Resource {
    final void register() {
        Core.getGlobalContext().register(this);
    }
    @Override
    public final void beforeCheckpoint(Context<? extends Resource> context) throws Exception {
        closeConnections();
    }
    @Override
    public final void afterRestore(Context<? extends Resource> context) throws Exception {
        reopenConnections();
    }
    protected abstract void closeConnections() throws Exception;
    protected abstract void reopenConnections() throws Exception;
}
```

## 虚拟线程扩的是等待并发，不是下游容量 {#virtual-thread-capacity}

JEP 444 在 JDK 21 交付。JEP 491 在 JDK 24 交付，JDK 25 继承它对 monitor pinning 的改善，不再笼统要求把所有 `synchronized` 改成锁。本地方法回调和类初始化等路径仍然可以 pin。细节在 Java 05。

数据库连接数、外部 QPS、CPU 和内存仍然有上限。一个任务一条虚拟线程，不把虚拟线程放进池。下游并发用信号量限制。结构化并发仍是预览，本页不用 `StructuredTaskScope`。

下面用稳定 API：`Executors.newVirtualThreadPerTaskExecutor()`、`Semaphore` 和 `Future.get()`。`Thread.sleep` 只是等待占位，不是业务 I/O，也不是性能证据。8 个许可是示意的下游预算，不是生产推荐值。中断向外抛，不吞掉。`acquire` 成功之后才进入 `finally` 释放。2026-11-23 用同一 Temurin JDK 25.0.5.1 编译通过，没有做压测。

```java
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

final class EmployeeWaitDemo {
    static String readEmployee() throws Exception {
        var permits = new Semaphore(8);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var result = executor.submit(() -> {
                permits.acquire();
                try {
                    Thread.sleep(10); // 合成等待，不是业务I/O实现或性能证据
                    return "Employee";
                } finally {
                    permits.release();
                }
            });
            return result.get();
        }
    }
}
```

真实服务里，许可应由共享的下游预算持有。每个请求各创建一个 `Semaphore`，并没有限制全服务并发。这里把生命周期放进一个方法，只为了单独演示。部署时回到组件自己的生命周期。这段代码不能证明吞吐提升。

## Leyden 的缓存仍在 JVM 内 {#leyden}

AOT 缓存加速的是 JVM 自己的启动和预热，不是把堆和 socket 保存下来，也不是 Native Image 那种闭合世界的可执行文件。

JEP 483 在 JDK 24 交付，做的是 AOT 类加载和链接。JDK 25 上可以写的是 JEP 514（简化命令行）和 JEP 515（方法 profiling），都已交付。JEP 516 在 JDK 26 交付，是已 GA 宿主上的差异，不是 25 已经具备。JEP 544 的页面状态是 Completed、Release 28，更新于 2026-11-11。JDK 28 仍在开发，不能把这份未来的 AOT 编译默认塞给 25 或 27。缓存必须和 JDK、类路径、运行条件相容。

## 四条路径按瓶颈与约束选 {#runtime-choice}

| 技术 | 它改变哪一段 | 前提 | 验证范围 |
|------|----------------|------|----------|
| 虚拟线程 | 阻塞等待时的并发 | 下游容量另有信号量；pinning 没有全部消失 | 等待是否卸载，不是 CPU 饱和 |
| CRaC | 把预热后的状态恢复出来 | 资源在回调里关闭并重建；要有 CRaC 宿主 | 恢复后的连接和身份，不是 API 能编译 |
| GraalVM Native | 启动和 RSS，代价在构建和动态能力 | 闭合世界、提示、对应工具链 | 关键行为要重跑，Agent 不一定还在 |
| Leyden AOT | JVM 内的启动和预热 | 缓存与 JDK、类路径相容 | 不是 checkpoint，也不是原生可执行文件 |

路径可以组合，但不承诺任意 Agent 或框架都兼容。每种形态都要在 15 的验证里重跑关键行为。不为原生而原生。

## 常见误读 {#_3}

<span id="_5"></span>

- 「CPU 已经饱和，换虚拟线程就会更快。」它不加 CPU，也不加数据库容量。
- 「JDK 24 之后没有 pinning 了。」本地回调和类初始化仍然可以 pin。
- 「CRaC 是 JDK 25 标准库默认就有的 restore 引擎。」OpenJDK 项目不是默认宿主。API jar 能编译也不等于能恢复。
- 「日历到了 2026-11-24，25.6 就一定已经发布。」本次核验日仍是 11-23，只能按当天打开的发行页。
- 「AOT cache 就是 checkpoint。」它不保存运行中的堆和 socket。
- 「上了原生镜像就不用再测，所有 Agent 也都能挂。」闭合世界改变了动态能力，监控要另核。

## 可选核对 {#runtime-check}

<span id="_6"></span>

瓶颈和保存对象已经写在上面。这两问只核对它们。

1. CPU 饱和和大量阻塞等待，分别该看哪条路径？为什么虚拟线程仍要限制下游？
2. CRaC 和 AOT cache 保存的东西有什么不同？为什么连接仍然要重建？

<details markdown><summary>参考答案</summary>

1. CPU 饱和看的是 CPU 和算法，虚拟线程不加 CPU。大量阻塞等待才是虚拟线程的范围。下游连接数和 QPS 仍然有限，所以要用共享信号量，而不是每个请求一把新的信号量。
2. CRaC 保存的是预热后的进程状态，里面的 socket 在恢复后不能盲用，要在回调里关闭并重建。AOT cache 留在 JVM 里，缓存的是类加载、链接或 profiling，不保存那条连接。

</details>

<span id="_8"></span>

## 资料索引 {#_4}

<span id="_7"></span>

- [GraalVM CE Builds](https://github.com/graalvm/graalvm-ce-builds/releases) 与 [25.5 发行说明](https://www.graalvm.org/release-notes/25.5/) — `graal-25.5.5.0.3`，基底 OpenJDK 25.0.5.0.3。[发行日历](https://www.graalvm.org/release-calendar/) 的下一 Feature 是 2026-11-24 的 25.6.0；2026-11-17 的 Oracle CSPU 不是 CE 新发行。
- [Spring Boot Native Image](https://docs.spring.io/spring-boot/reference/packaging/native-image/introducing-graalvm-native-images.html) 与 [checkpoint-restore](https://docs.spring.io/spring-boot/reference/packaging/checkpoint-restore.html) — 当前文档随平台走到 4.2 线。本页不把这条动态文档倒推成旧工程已经编译，命令也未执行。
- [OpenJDK CRaC](https://openjdk.org/projects/crac/) — 项目，不是 JDK 25 默认引擎。
- [Azul CRaC 介绍](https://docs.azul.com/core/crac/crac-introduction) — 真实 CRaC 限于列出的 Linux；其他平台可以模拟。包号本次不报。
- [BellSoft Liberica JDK with CRaC](https://bell-sw.com/libericajdk-with-crac/) — 产品页提到 Java 17 和 21，不能当作完整下载矩阵。
- [`Resource` javadoc](https://javadoc.io/static/org.crac/crac/1.5.0/org/crac/Resource.html) 与 [`Core`](https://javadoc.io/static/org.crac/crac/1.5.0/org/crac/Core.html) — `beforeCheckpoint` / `afterRestore` 均 `throws Exception`。Maven `org.crac:crac` 的 `latest` / `release` 是 1.5.0。
- [JEP 444](https://openjdk.org/jeps/444)、[JEP 491](https://openjdk.org/jeps/491) — 21 与 24 已交付。491 写明本地回调等 pinning 仍在。
- [JEP 483](https://openjdk.org/jeps/483)、[514](https://openjdk.org/jeps/514)、[515](https://openjdk.org/jeps/515)、[516](https://openjdk.org/jeps/516)、[544](https://openjdk.org/jeps/544) — 483 在 24，514 和 515 在 25，516 在 26，544 的 Release 是 28 且 28 未 GA。
- [JDK 发行列表](https://openjdk.org/projects/jdk/) — 25 为 GA（2025-09-16），27 为 GA（2026-09-15），28 仍在开发。
- [Java 05](../../java/05-concurrency/)、[Java 11](../../java/11-performance-diagnostics/)、[Java 12](../../java/12-ecosystem-trends/) — 调度、测量、发行边界。本页不重写。

---

← [上一节：测试](../15-testing/) · [返回 微服务](../)
