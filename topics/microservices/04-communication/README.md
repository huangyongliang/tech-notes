# 服务通信 {#service-communication}

> [微服务](../) › 服务通信

同步调用的客户端合同只保证「这次请求如何被描述」；超时、重试和幂等是它能成立的条件，不是协议名本身。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 给了边界，[注册发现与配置](../03-discovery-config/) 给了如何找到实例，[API 网关](../02-api-gateway/) 给了南北向入口。本页写服务与服务之间的同步调用：用什么抽象描述这次调用，失败时什么可以重试，超时如何从上游 SLA 往下压。容错库、网格重试与限流在 [05](../05-resilience/)。消息投递语义在 [06](../06-messaging/)。Spring 侧的客户端与 Cloud 组件回链 [Java 09](../../java/09-spring/)，本页不重写容器或 MVC。阻塞调用与虚拟线程只回指 [Java 05](../../java/05-concurrency/)。

## 同步把失败留在请求路径上 {#_2}

同步调用把协作写在请求路径上，延迟和失败会沿调用链放大。它适合需要立即得到结果、契约稳定的查询或命令。异步把协作放到消息或事件上，适合解耦和削峰，但要把投递、顺序和幂等交给 06。异步并不因此更好。本页不罗列消息产品。

## 新的 Spring 代码优先用 HTTP Interface {#http-interface}

Spring Framework 7 提供基于接口的 HTTP Service Client。`@HttpExchange`、`@GetExchange` 等注解描述路径、方法和参数，由 `HttpServiceProxyFactory` 生成代理。底层可以是 `RestClient`、`WebClient`，或仍被支持但已不作为推荐入口的 `RestTemplate`。它保证的是「用接口表达这次 HTTP 调用」，并不自动带上发现、负载均衡或断路。那些要另叠，或由 Spring Cloud 的集成提供。

Framework 7.0 已把 `RestTemplate` 标为弃用，推荐迁到 `RestClient`。本页只记下这条纪律，不写迁移对照表。正文钉的是 Framework **7.0** 这一线。GitHub 最新非预发布是 7.0.10（2026-10-22）。[项目页](https://spring.io/projects/spring-framework) 标题在 2026-11-13 仍显示 7.0.8，不要把这个滞后的补丁号写成最新。Boot 4.2 与 Framework 7.1 仍是 RC，不得写成默认。

下面的接口已在 2026-11-13 用 JDK 25.0.5（Temurin 25.0.5+8）对 `spring-web` 7.0.10 编译通过。未创建客户端代理，未发请求。

```java
@HttpExchange("/api/employees")
public interface EmployeeClient {
    @GetExchange("/{id}")
    Employee get(@PathVariable String id);
}
```

## OpenFeign 是存量，不是新的默认 {#openfeign}

官方参考文档写明：自 Spring Cloud 2022.0.0 起，将该项目视为 feature-complete，原则上只修缺陷、偶尔合并小型社区特性，并建议迁到 Spring HTTP Service Clients。当前稳定线仍是 **5.0.4**，随 Spring Cloud 2025.1.4 发布。存量 Feign 可以继续维护。新代码应优先评估 HTTP Interface，而不是把 Feign 当作 2026-11 的默认新选择。feature-complete 不是「已从 Maven 删除」，也不是「自动变成 gRPC」。主题首页的选型表本批不改，那里仍可能写着 OpenFeign；新代码的取舍以本页为准。

## gRPC 与 Dubbo 是条件，不是目录 {#rpc}

gRPC Java **1.85.1**（2026-10-20，仍为 GitHub Latest 且非预发布）用 Protobuf 契约和 HTTP/2，适合内部高 QPS、强类型、多语言的接口。浏览器与网关链路上通常更复杂。本页不教 `.proto` 写法。

Apache Dubbo 的当前 3.3.x 稳定线是 **3.3.7**。2026-11-13 打开的 GitHub Latest 与 Maven `org.apache.dubbo:dubbo` 的 `latest` / `release` 都是 3.3.7：发行页 `prerelease` 为 false，`published_at` 为 2026-10-26，Maven `lastUpdated` 为 2026-11-07。发行说明提到增加 JDK 25 支持。3.2.20 仍是 3.2 维护线上的 GA，不得因为某次 Latest 指针或日期而把它写成 3.3 主线。

一般纪律仍然成立：GitHub Latest 可能指向旧维护分支或预发布，必须对照主线 tag、发行说明和 Maven `release`。Spring Cloud Alibaba 仓库就是 Latest 不可靠的现成例子：不要用它的 GitHub Latest 判断当前列车。不要再把「Dubbo 的 Latest 指向 3.2.20」写成现在的事实，也不要把已经是 GA 的 3.3.7 写成预发布。

## 超时从上游往下压，重试只打在幂等上 {#timeout}

同步链路的深度和扇出宽度直接决定尾延迟。超时要从用户 SLA 倒推，下游超时之和应小于上游，避免层层放大。默认必须有明确超时，禁止无限重试。只对幂等读，或带幂等键的写做重试。用 GET 做写，却依赖网关或客户端重试，会造成重复提交。

API 版本化只写到原则：显式版本，不随意破坏已有字段。不写网关插件教程。熔断、舱壁和限流库留给 05。

## 四种客户端各自保证什么 {#comm-choice}

| 方式 | 版本 / 状态 | 优点 | 注意 |
|------|-------------|------|------|
| HTTP Interface / RestClient | Framework 7.0 | 官方推荐的新代码入口 | 需自行叠发现与容错；`RestTemplate` 已弃用 |
| OpenFeign | 5.0.4 feature-complete | 存量多 | 新功能不再演进，不是新项目默认 |
| gRPC | 1.85.1 | 高性能、多语言、强契约 | 浏览器与网关链路更复杂 |
| Dubbo | 3.3.7 | 治理一体的 RPC | 3.2.20 只是 3.2 维护线；与云原生栈的集成要单独规划 |

## 常见误读 {#_3}

- 「新服务仍以 OpenFeign 为默认。」官方建议新代码评估 HTTP Interface。Feign 并未从 Maven 删除。
- 「`RestTemplate` 仍是推荐入口。」Framework 7.0 已把它标为弃用，推荐 `RestClient`。
- 「3.3.7 还是预发布，Latest 仍指向 3.2.20。」2026-11-13 的 Latest 和 Maven `release` 都是 3.3.7。3.2.20 是 3.2 维护线。
- 「GitHub Latest 永远等于当前主线。」多列车仓库上它可能指向旧标签。SCA 就是例子。
- 「同步链路可以无限重试。」非幂等的写会被重复提交。超时也必须从上游 SLA 往下压。

## 可选核对 {#comm-check}

客户端合同和超时条件已经写在上面。这两问只核对它们。

1. OpenFeign「feature-complete」意味着什么？新代码为什么应优先考虑 HTTP Interface？
2. 同步调用链上，超时大致应如何约束？

<details markdown><summary>参考答案</summary>

1. 自 Spring Cloud 2022.0.0 起，OpenFeign 原则上只修缺陷、偶尔合并小型社区特性，并建议迁到 Spring HTTP Service Clients。它没有从 Maven 删除。新代码优先用 `@HttpExchange` 这一类接口，因为那是 Framework 7 仍在演进的客户端合同。
2. 从用户 SLA 倒推，下游超时之和应小于上游，避免层层放大。默认要有明确超时，禁止无限重试。重试只用于幂等读，或带幂等键的写。

</details>

## 资料索引 {#_4}

- [Spring REST Clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html) — RestClient、HTTP Service Clients，以及 Framework 7.0 起 `RestTemplate` 弃用。项目页标题在 2026-11-13 仍显示 7.0.8；GitHub 非预发布最新是 7.0.10（2026-10-22）。正文钉 Framework 7.0，不把 7.0.8 写成最新补丁。
- [Spring Cloud OpenFeign](https://docs.spring.io/spring-cloud-openfeign/reference/) — 自 2022.0.0 起 feature-complete，建议迁到 HTTP Service Clients。当前稳定线 5.0.4。
- [gRPC Java 文档](https://grpc.io/docs/languages/java/) — 稳定线 1.85.1（2026-10-20，非预发布）。本页不教 `.proto`。
- [Apache Dubbo 概览](https://cn.dubbo.apache.org/zh-cn/overview/) 与 [3.3.7 发行说明](https://github.com/apache/dubbo/releases/tag/3.3.7) — 2026-11-13：3.3.7 为非预发布（2026-10-26），Maven `org.apache.dubbo:dubbo` 的 `latest` / `release` 均为 3.3.7。3.2.20 是 3.2 维护线。
- [Java 09](../../java/09-spring/) — 客户端与 Cloud 组件的职责分界。
- [Java 05](../../java/05-concurrency/) — 阻塞调用与虚拟线程。本页不重讲。
- [微服务 03](../03-discovery-config/) — 发现不是调用合同。
- [微服务 05](../05-resilience/) — 超时之后的容错。
- [微服务 06](../06-messaging/) — 异步协作的投递语义。

---

← [上一节：注册发现与配置](../03-discovery-config/) · [返回 微服务](../) · [下一节：容错与流量治理](../05-resilience/) →
