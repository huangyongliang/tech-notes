# API 网关 {#api-api-gateway}

> [微服务](../) › API 网关

网关保证的是南北向入口上的路由和横切策略；它不能变成第二套单体，也不能把领域规则堆进过滤器。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 要求先有稳定边界。本页写的是南北向入口：请求如何被路由到某个服务，哪些横切策略适合放在边缘。服务网格的东西向治理在 [13](../13-service-mesh/)，本页只区分「南北向入口」和「网格数据面」，不写网格操作。BFF 是面向某一类客户端的后端聚合，与通用 API 网关职责不同，点到为止。反向代理可以做 TLS 与负载，但不自动带来可版本化的路由合同和过滤器模型。编程模型差异回链 [Java 09](../../java/09-spring/) 的 MVC 与 WebFlux，本页不重讲。

## 适合放在边缘的，和必须留在应用里的 {#_2}

适合放在网关：TLS 终结、路由改写、认证校验、全局限流、请求日志与 Trace 注入、金丝雀分流。金丝雀在这里只是入口分流的条件；流水线怎么晋级，留给 [14](../14-cicd-gitops/)。

不适合放在网关：计价、库存扣减这类领域规则，以及跨多个聚合根的长事务编排。那些应放在应用服务或工作流，事务见 [07](../07-distributed-transactions/)。网关可以做粗粒度的请求拼装，不能把业务流程编进过滤器，否则它会变成难测、难发布的第二套单体。

鉴权在边缘校验身份与入口权限。服务内部仍可能需要授权。两边策略必须一致，不能各写一套又对不上。认证授权的细节不在本页展开，见 [11](../11-security/)。

## Spring Cloud Gateway 是 Server，不是 Zuul {#spring-cloud-gateway2025}

当前稳定线是 Spring Cloud Gateway **5.0.4**，随 Spring Cloud **2025.1.4**（Oakwood）发布。GitHub 非预发布的时间是 2026-10-23。官方文档写明有 Server 与 Proxy Exchange 两种形态，各有 WebFlux 与 Web MVC。本页以 Server 为主：它可以独立或内嵌。Proxy Exchange 只是注解式应用里的 `ProxyExchange` 参数，本页不另开操作课。

文档推荐的 starter 是 `spring-cloud-starter-gateway-server-webflux` 与 `spring-cloud-starter-gateway-server-webmvc`。旧名 `spring-cloud-starter-gateway` 和 `spring-cloud-starter-gateway-mvc` 不再是文档推荐写法。WebFlux 版建立在 WebFlux、Reactor 和 Netty 上，不在传统 Servlet 容器或 WAR 里工作。MVC 版建立在 Spring WebMvc 上，可在 Tomcat、Jetty 等 Servlet 运行时工作。

路由前缀与下面的 YAML 一致：`spring.cloud.gateway.server.webflux`。这段 YAML 只做了语法解析，没有启动网关。

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: leave-service
              uri: lb://leave-service
              predicates:
                - Path=/api/leaves/**
              filters:
                - StripPrefix=1
```

> [!WARNING]
> Zuul 1 已停止维护，新项目不要选。它不是当前 Spring Cloud 网关的默认，也不再出现在现行 Spring Cloud Netflix 参考文档的主线能力里。现行文档只把 Eureka 作为仍提供的模式。Hystrix 与 Ribbon 的废弃留给 [05](../05-resilience/)，本页不展开。Boot 4.2、Cloud 2026.0 的 RC，以及 Gateway `5.0.5-SNAPSHOT`，都不是已交付的默认。

## 与 Kubernetes Gateway API 可以并存 {#kubernetes-gateway-api}

Kubernetes Gateway API **v1.7.0**（2026-10-29，非预发布）加上 Envoy（当前稳定线 **1.40.2**，2026-10-27）可以做集群南北向入口，与 Spring Cloud Gateway 可以并存。集群外或多语言入口用 Gateway API，Java 团队内的可编程聚合仍可用 SCG。有了 Gateway API，并不因此必须拆掉 SCG。Ingress 的私有注解也不是唯一选择。

## 选型看适用条件，不看口号 {#gateway-choice}

<span id="_5"></span>

| 方案 | 版本基线 | 特点 | 更适场景 |
|------|----------|------|----------|
| Spring Cloud Gateway | 5.0.4 | Java 生态、过滤器可编程 | Spring 技术栈、流量中等 |
| Kong | 3.9.4 | 插件生态 | 多语言、插件化治理 |
| Apache APISIX | 3.20.0 | 动态配置、高性能 | 高流量、云原生插件 |
| Envoy + Gateway API | Envoy 1.40.2 / Gateway API v1.7.0 | 与 K8s 深度集成 | 平台团队、网格同源数据面 |

版本只写稳定线。Kong 3.9.4 的日期是 2026-10-12，仍为 GitHub Latest 且非预发布。APISIX 3.20.0 在 2026-11-11 出现在 Apache 发行目录和 GitHub 非预发布发行。补丁来源放在资料索引。

## 入口限流护不住服务内部 {#rate-limit}

网关限流保护入口和整体配额。服务内限流保护自身依赖、线程和连接，防止内部扇出或旁路把服务打满。只在网关限流，服务内不限，内部调用仍可能耗尽资源。库和网格上的限流留给 [05](../05-resilience/)。

## 常见误读 {#_3}

<span id="_6"></span>

- 「计价和库存扣减可以写进网关过滤器。」那是领域规则，网关会变成第二套单体。
- 「边缘鉴权做了，服务里就可以不再管授权。」两边策略必须一致。
- 「有了 Gateway API 就要拆掉 Spring Cloud Gateway。」它们可以并存，入口不同。
- 「新项目还可以选 Zuul 1。」它已停止维护，不是当前默认。
- 「只在网关限流就够了。」服务内扇出和旁路不经过那条入口配额。

## 可选核对 {#gateway-check}

<span id="_7"></span>

职责边界已经写在上面。这两问只核对它们。

1. 哪类能力适合放在 API 网关，哪类必须留在应用服务？
2. 为什么新项目不应再选 Zuul 1？

<details markdown><summary>参考答案</summary>

1. 适合放在网关的是入口横切：路由、认证校验、全局限流、日志与 Trace、有限的金丝雀分流。计价、库存扣减和跨聚合根的长事务必须留在应用服务或工作流。
2. Zuul 1 已停止维护，不是当前 Spring Cloud 网关的默认，也不在现行 Spring Cloud Netflix 文档的主线能力里。新项目用 Gateway 的 Server starter。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [Spring Cloud Gateway 总览](https://docs.spring.io/spring-cloud-gateway/reference/) — Server 与 Proxy Exchange 两种形态。本页以 Server 为主。
- [WebFlux starter](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/starter.html) — 推荐坐标 `spring-cloud-starter-gateway-server-webflux`。基于 WebFlux / Reactor / Netty，不在传统 Servlet 容器或 WAR 中工作。
- [Web MVC starter](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webmvc/starter.html) — 推荐坐标 `spring-cloud-starter-gateway-server-webmvc`。基于 WebMvc，可在 Tomcat / Jetty 上工作。旧名不再是文档推荐写法。
- [Spring Cloud 项目页](https://spring.io/projects/spring-cloud) — 2026-11-13 标题为 2025.1.4（Oakwood），适配 Boot 4.0.x 与 4.1.x。Gateway 5.0.4 随该列车发布。`5.0.5-SNAPSHOT` 不是已交付版本。
- [Kong Gateway 文档](https://docs.konghq.com/gateway/latest/) — 多语言插件化网关。稳定线 3.9.4（2026-10-12，非预发布）。
- [Apache APISIX 文档](https://apisix.apache.org/docs/) 与 [Apache 发行目录](https://downloads.apache.org/apisix/) — 2026-11-13 的稳定线是 3.20.0（2026-11-11），不是 3.19.0。
- [Envoy 文档](https://www.envoyproxy.io/docs/envoy/latest/) — 当前稳定线 1.40.2（2026-10-27）。旧分支补丁不是这条主线。
- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) — v1.7.0（2026-10-29）。与 SCG 可以并存。
- [Java 09](../../java/09-spring/) — MVC 与 WebFlux 的编程模型。本页不重讲。
- [微服务 01](../01-architecture/) — 边界先于入口。
- [微服务 05](../05-resilience/) — 服务内限流与容错。
- [微服务 13](../13-service-mesh/) — 网格数据面。本页只区分南北向入口。

---

← [上一节：架构基础与拆分](../01-architecture/) · [返回 微服务](../) · [下一节：注册发现与配置](../03-discovery-config/) →
