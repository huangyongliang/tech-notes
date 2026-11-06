# 容错与流量治理 Resilience & Traffic

> [微服务](../) › 容错与流量治理

超时、重试、熔断、隔离、限流与降级。对比库级方案与网格级方案。

Spring Cloud 容错组件见 [Spring 框架](../../java/09-spring/)。

## 本关定位

同步扇出放大故障：一个慢依赖可以拖垮整条链路。本关建立超时、重试、熔断、舱壁与限流的组合拳，并分清应用库（Resilience4j / Sentinel）与网格能力的边界。

## 闯关任务

- [ ] 能够解释超时、重试、熔断、隔离、限流、降级各自解决什么问题。
- [ ] 能够用 Resilience4j 配置 CircuitBreaker / RateLimiter / Bulkhead 的基本参数。
- [ ] 能够对比 Resilience4j 与 Sentinel 的规则模型与适用场景。
- [ ] 能够说明「网格重试 + 应用重试」叠加的风险。
- [ ] 能够设计针对非幂等写操作的重试策略（基本禁止或幂等键）。

## 知识要点

### 失败模式与对策

| 现象 | 优先手段 |
|------|----------|
| 下游慢 | 超时 + 舱壁隔离 |
| 下游持续错误 | 熔断 + 降级 |
| 突发流量 | 限流 / 排队 |
| 瞬时故障 | 有限次退避重试（仅幂等） |

### Resilience4j

Resilience4j 2.4.0 是 Hystrix 之后的主流库级方案，与 Spring Cloud Circuit Breaker 集成良好。下面的注解方法已在 2026-11-06 用 JDK 21.0.12.1 对 `resilience4j-annotations` 2.4.0 编译通过。`fallback` 方法没有写在片段里，未运行。

```java
@CircuitBreaker(name = "hrClient", fallbackMethod = "fallback")
@TimeLimiter(name = "hrClient")
public CompletableFuture<LeaveBalance> balance(String empId) {
    return CompletableFuture.supplyAsync(() -> client.getBalance(empId));
}
```

> [!WARNING]
> Netflix Hystrix 与 Ribbon 已停止维护，新项目不要选。

### Sentinel

Sentinel 1.8.10 强在流量整形、热点参数限流与规则动态推送，国内阿里系常见。规则中心化后要防止「规则错误导致全站拒绝」。

### 与网格分工

网格适合统一的连接级重试、异常注入、区域故障转移；业务降级文案、按用户等级限流等仍宜在应用层。两侧同时开启重试时必须协调最大次数与幂等。

## 选型对比

| 方案 | 版本基线 | 粒度 | 更适场景 |
|------|----------|------|----------|
| Resilience4j | 2.4.0 | 方法 / 实例 | Spring 应用内、代码即策略 |
| Sentinel | 1.8.10 | 资源名 / 热点 | 动态规则、流量整形 |
| Mesh（Istio 等） | 见 13 章 | 连接 / 路由 | 多语言统一治理 |
| Spring Cloud LoadBalancer | 随 Cloud 发行版 | 客户端均衡 | 替代 Ribbon |

## 常见误区

- 对所有 POST 无条件重试。
- 熔断阈值过宽，正常抖动也打开。
- 只限流入口，不隔离慢依赖线程池。
- 网格与 Resilience4j 双重重试导致写放大。

## 实践任务

- [ ] 给一个故意 sleep 的下游加超时与熔断，观察 fallback 触发。
- [ ] 用 Sentinel 控制台（或本地规则）对热点参数限流。
- [ ] 画一张「超时从外到内递减」的调用链参数表。

## 资料索引

- [Resilience4j 文档](https://resilience4j.readme.io/docs) — 熔断 / 限流 / 舱壁
- [Sentinel 介绍](https://sentinelguard.io/zh-cn/docs/introduction.html) — 流量防卫兵概念
- [Spring Cloud Circuit Breaker](https://spring.io/projects/spring-cloud-circuitbreaker) — 抽象与实现桥接
- [Microservices.io 熔断模式](https://microservices.io/patterns/reliability/circuit-breaker.html) — 模式说明

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】对新项目，下列哪项不应再作为默认容错组件？
    - A. Resilience4j
    - B. Sentinel
    - C. Hystrix
    - D. 网格重试（经评估后）
2. 【单选】舱壁（Bulkhead）的主要目的是：
    - A. 加密流量
    - B. 隔离资源，避免一个依赖耗尽全部线程
    - C. 替代数据库事务
    - D. 生成 OpenAPI
3. 【简答】为什么要对非幂等写操作谨慎重试？
4. 【单选】限流与熔断的差别，更准确的是：
    - A. 完全相同
    - B. 限流约束进入速率；熔断在错误率 / 慢调用过高时快速失败
    - C. 熔断只用于前端
    - D. 限流只能在数据库层
5. 【简答】应用层与服务网格同时配置重试时要注意什么？

<details markdown><summary>参考答案</summary>

1. C — Hystrix 已停止维护。
2. B — 隔离失败域与线程 / 信号量资源。
3. 重试可能导致重复下单、重复扣款等；需幂等键或改为业务可补偿。
4. B — 关注点不同，常组合使用。
5. 协调最大重试次数、退避与幂等，避免乘法效应导致写放大或雪崩。

</details>

---

← [上一节：服务通信](../04-communication/) · [返回 微服务](../) · [下一节：消息与事件驱动](../06-messaging/) →
