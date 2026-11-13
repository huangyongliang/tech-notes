# 容错与流量治理 {#resilience-traffic}

> [微服务](../) › 容错与流量治理

超时、重试、熔断、舱壁和限流限制的是失败域和进入速率；重试只在幂等上成立，库和网格同时重试会把次数乘起来。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 给了边界，[注册发现与配置](../03-discovery-config/) 给了实例列表。[服务通信](../04-communication/) 已经要求超时从上游 SLA 往下压，并且只对幂等操作重试。本页把这条合同推进到部分失败：如何隔离、快速失败、限制进入。Spring 侧的容错组件回链 [Java 09](../../java/09-spring/)，本页不重写容器或 AOP。网格上的连接级重试、异常注入和区域故障转移留给 [13](../13-service-mesh/)。入口限流与服务内限流的分工在 [02](../02-api-gateway/)，本页不改那一页。

## 失败模式各自解决什么 {#_2}

| 现象 | 优先手段 |
|------|----------|
| 下游慢 | 超时 + 舱壁隔离 |
| 下游持续错误 | 熔断 + 降级 |
| 突发流量 | 限流 / 排队 |
| 瞬时故障 | 有限次退避重试（仅幂等） |

下游慢时，优先超时加舱壁，避免一个依赖耗尽全部线程或信号量。下游持续错误时，熔断加降级，让调用方快速失败，而不是把超时叠满整条链。突发流量用限流或排队约束进入速率。瞬时故障只对幂等读，或带幂等键的写，做有限次退避重试。

限流约束的是进入速率。熔断是在错误率或慢调用过高时快速失败。二者常组合，不是同一件事。超时应从外到内递减，下游超时之和小于上游。这条原则已经写在 04，本页不重写。

## Resilience4j 保证什么 {#resilience4j}

当前稳定线是 **2.4.0**。2026-11-13 打开的 Maven `io.github.resilience4j:resilience4j-annotations` 与 `resilience4j-circuitbreaker`，`latest` 与 `release` 都是 2.4.0，`lastUpdated` 为 2026-03-14。GitHub 非预发布与 Latest 同为 v2.4.0。它是 Hystrix 之后的主流库级方案，粒度是方法或实例，策略写在代码或配置里，与 Spring Cloud Circuit Breaker 集成良好。

它保证的是：这次调用在超时、熔断、舱壁或限流条件触发时，按设定失败或走 fallback。它不自动带上发现，也不代替网格策略。

下面的注解方法已在 2026-11-13 用 JDK 25.0.5（Temurin 25.0.5+8）对 `resilience4j-annotations` 2.4.0 编译通过。`fallback` 方法没有写在片段里，未运行。

```java
@CircuitBreaker(name = "hrClient", fallbackMethod = "fallback")
@TimeLimiter(name = "hrClient")
public CompletableFuture<LeaveBalance> balance(String empId) {
    return CompletableFuture.supplyAsync(() -> client.getBalance(empId));
}
```

> [!WARNING]
> Netflix Hystrix 与 Ribbon 已停止维护，新项目不要选。客户端均衡的替代是 Spring Cloud LoadBalancer，随 Cloud 发行版。Eureka 与 Zuul 1 的口径已在 02 / 03 写过，本页不重开。

## Sentinel 钉在 1.8.10 {#sentinel}

当前稳定线是 **1.8.10**。GitHub 非预发布与 Latest 都是 1.8.10（2026-05-21）。它强在流量整形、热点参数限流和规则动态推送，粒度是资源名或热点，国内阿里系常见。规则中心化之后，要防止规则错误导致全站拒绝。

不得把 Maven `com.alibaba.csp:sentinel-core` 的 `latest` / `release` 写成当前默认。2026-11-13 二者都指向 **`2.0.0-alpha`**，`lastUpdated` 为 2026-05-21，与 1.8.10 同一天刷新。GitHub 把 `2.0.0-alpha` 标为预发布，发布于 2023-02-28。版本比较上它高于 1.8.10，所以 `latest` 不是稳定线。这和 Modulith 的 `2.2.0-RC1` 是同一类指针陷阱。正文钉 1.8.10，不把本章写成升级到 Sentinel 2。

## 库和网格要分开算重试 {#mesh-split}

<span id="_5"></span>

网格适合统一的连接级重试、异常注入和区域故障转移。业务降级文案、按用户等级限流，仍宜放在应用层。两侧同时开启重试时，必须协调最大次数、退避和幂等，避免乘法效应造成写放大。有了网格，也不可以拆掉应用内超时。本页不写 Istio 配置。

## 选型是条件，不是擂台 {#resilience-choice}

<span id="_6"></span>

| 方案 | 版本基线 | 粒度 | 更适场景 |
|------|----------|------|----------|
| Resilience4j | 2.4.0 | 方法 / 实例 | Spring 应用内、代码即策略 |
| Sentinel | 1.8.10 | 资源名 / 热点 | 动态规则、流量整形 |
| Mesh（Istio 等） | 见 13 章 | 连接 / 路由 | 多语言统一治理 |
| Spring Cloud LoadBalancer | 随 Cloud 发行版 | 客户端均衡 | 替代 Ribbon |

Resilience4j 适合应用内、代码即策略、与 Spring Cloud Circuit Breaker 集成。Sentinel 适合动态规则、热点参数和流量整形。二者都不是 Hystrix 的唯一继承人，也不必二选一。

## 常见误读 {#_3}

<span id="_7"></span>

- 「对所有 POST 无条件重试。」非幂等写会被重复执行。需要幂等键，或改成可补偿的业务。
- 「熔断和限流是同一件事。」限流约束进入速率；熔断在错误率或慢调用过高时快速失败。
- 「舱壁只是加密或事务。」舱壁隔离的是线程或信号量，避免一个慢依赖耗尽全部资源。
- 「新项目还可以选 Hystrix 或 Ribbon。」二者已停止维护。
- 「网格和 Resilience4j 各重试三次就只是三次。」次数会相乘，写会被放大。
- 「Maven `latest` 就是 Sentinel 2 的稳定版。」它指向的是 `2.0.0-alpha`。

## 可选核对 {#resilience-check}

<span id="_8"></span>

失败域和重试条件已经写在上面。这两问只核对它们。

1. 为什么不能对非幂等写操作无条件重试？
2. 应用层与网格同时配置重试时要注意什么？

<details markdown><summary>参考答案</summary>

1. 重试会把同一次写再执行一遍，造成重复副作用。没有幂等键，或这次写本身不可重入，就不能无条件重试。
2. 必须协调最大次数、退避和幂等。两边各重试一次，调用次数会相乘，写会被放大。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [Resilience4j 文档](https://resilience4j.readme.io/docs) — 熔断、限流、舱壁。稳定线 2.4.0（2026-03-14）。
- [Sentinel 介绍](https://sentinelguard.io/zh-cn/docs/introduction.html) — 流量整形与热点限流。稳定线钉 1.8.10。Maven `com.alibaba.csp:sentinel-core` 的 `latest` / `release` 指向 `2.0.0-alpha`（2023 年的预发布），不是当前默认。
- [Spring Cloud Circuit Breaker](https://spring.io/projects/spring-cloud-circuitbreaker) — 把熔断抽象接到 Resilience4j 等实现。
- [Microservices.io 熔断模式](https://microservices.io/patterns/reliability/circuit-breaker.html) — 错误率过高时快速失败。
- [Java 09](../../java/09-spring/) — 容错组件所在的容器与代理。本页不重写。
- [微服务 04](../04-communication/) — 超时从上游往下压，只对幂等操作重试。
- [微服务 13](../13-service-mesh/) — 网格数据面上的重试与故障转移。
- [微服务 02](../02-api-gateway/) — 入口限流。本页写服务内隔离。

---

← [上一节：服务通信](../04-communication/) · [返回 微服务](../) · [下一节：消息与事件驱动](../06-messaging/) →
