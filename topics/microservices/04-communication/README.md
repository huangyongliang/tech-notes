# 服务通信 Service Communication

> [微服务](../) › 服务通信

同步调用（REST、RPC）的选型与客户端写法。Spring 6+ 推荐声明式 HTTP Interface 客户端，OpenFeign 进入功能完成状态。

Spring 客户端与 Cloud 组件见 [Spring 框架](../../java/09-spring/)。

## 本关定位

同步通信是服务协作的默认路径之一：选错协议或客户端抽象，会导致延迟、耦合与超时雪崩。本关掌握 REST / gRPC / Dubbo 的取舍，以及 Spring 侧推荐写法。

## 闯关任务

- [ ] 能够对比 REST、gRPC、Dubbo 在性能、契约与多语言上的差异。
- [ ] 能够使用 Spring RestClient / HTTP Interface 编写声明式客户端。
- [ ] 能够说明 OpenFeign 处于 feature-complete 的含义，以及存量迁移策略。
- [ ] 能够为同步调用设计超时、重试与幂等的基本约束（与容错章呼应）。
- [ ] 能够解释服务间 API 版本化与向后兼容的基本做法。

## 知识要点

### Spring HTTP Interface（优先）

Spring Framework 7 提供基于接口的 HTTP 客户端，配合 `@HttpExchange` 等注解，类型安全且与 Spring 生态一致。该接口已在 2026-11-06 用 JDK 21.0.12.1 对 `spring-web` 7.0.10 编译通过；未创建客户端代理，未发请求。

```java
@HttpExchange("/api/employees")
public interface EmployeeClient {
    @GetExchange("/{id}")
    Employee get(@PathVariable String id);
}
```

> [!NOTE]
> Spring Cloud OpenFeign 5.0.4 官方已声明 feature-complete，新代码优先用 HTTP Interface；存量 Feign 可继续维护。

### gRPC 与 Dubbo

- gRPC Java 1.85.1：Protobuf 契约、HTTP/2、多语言，适合内部高 QPS、强类型接口。
- Apache Dubbo：GitHub `releases/latest` 曾指向维护分支 `dubbo-3.2.20`；3.3.x 线以 `dubbo-3.3.6` 为较新 GA tag，另有名为 `3.3.7` 的 **prerelease**（2026-10-26）。引用时写清通道，勿把 Latest 当成最新主线。

### 超时与扇出

同步链路深度与扇出宽度直接决定尾延迟。约定：默认超时明确、禁止无限重试、只对幂等读或带幂等键的写重试。

## 选型对比

| 方式 | 版本 / 状态 | 优点 | 注意 |
|------|-------------|------|------|
| HTTP Interface / RestClient | Spring Framework 7 | 官方推荐、与 Boot 4 一致 | 需自行叠发现与容错 |
| OpenFeign | 5.0.4 feature-complete | 存量多、注解熟悉 | 新功能不再演进 |
| gRPC | 1.85.1 | 高性能、多语言 | 浏览器与网关链路更复杂 |
| Dubbo | 3.3.6 GA（3.3.7 prerelease 待核实生产采用） | 国内生态、服务治理一体 | 与云原生栈集成需规划 |

## 常见误区

- 新服务继续以 Feign 为默认，而不评估 HTTP Interface。
- 把 `releases/latest` 的 Dubbo 3.2.x 误当成最新主线。
- 同步链路过深且无超时，导致线程耗尽。
- 用 GET 做写操作，却依赖网关重试——造成重复提交。

## 实践任务

- [ ] 用 HTTP Interface 调用另一服务的只读 API，并配置连接 / 读取超时。
- [ ] 写一个最小 gRPC `.proto` + Java 客户端，对比同等 REST 的延迟观感（本地即可）。
- [ ] 列出当前项目中 Feign 接口，标注哪些可迁移、哪些依赖 Feign 特有能力。

## 资料索引

- [Spring REST Clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html) — RestClient / HTTP Interface
- [Spring Cloud OpenFeign](https://docs.spring.io/spring-cloud-openfeign/reference/) — feature-complete 声明与参考
- [gRPC Java 文档](https://grpc.io/docs/languages/java/) — 官方教程
- [Apache Dubbo 概览](https://cn.dubbo.apache.org/zh-cn/overview/) — Dubbo 3 与 Triple 协议

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Spring 官方更推荐新代码使用的声明式 HTTP 客户端是：
    - A. 仅 OpenFeign
    - B. HTTP Interface
    - C. 仅 Hutool HttpUtil
    - D. 仅 JDK HttpURLConnection
2. 【单选】OpenFeign「feature-complete」意味着：
    - A. 已从 Maven 删除
    - B. 功能冻结，原则上不再加新特性，存量可维护
    - C. 只能用于测试
    - D. 自动迁移到 gRPC
3. 【简答】同步调用链路上，超时应该如何大致设置？
4. 【单选】内部多语言、强契约、高 QPS 的服务间调用更常考虑：
    - A. 仅共享数据库
    - B. gRPC
    - C. 仅 FTP
    - D. 仅浏览器表单 POST
5. 【简答】为什么说 GitHub `releases/latest` 不一定等于「当前主线最新版」？

<details markdown><summary>参考答案</summary>

1. B — 与 Spring Framework 7 对齐。
2. B — 官方声明功能完成，新特性转向其他客户端。
3. 从用户 SLA 倒推，下游超时之和应小于上游；越靠近数据源超时越短，避免层层放大。
4. B — Protobuf + HTTP/2 适合该场景。
5. Latest 常指向默认仓库的最新 Release，可能是旧维护分支的补丁（如 Dubbo 3.2.20），需对照主线 tag / 发行说明交叉验证。

</details>

---

← [上一节：注册发现与配置](../03-discovery-config/) · [返回 微服务](../) · [下一节：容错与流量治理](../05-resilience/) →
