# API 网关 API Gateway

> [微服务](../) › API 网关

统一入口，负责路由、鉴权、限流、灰度。对比 Java 原生网关与基于 Nginx / Envoy 的高性能网关。

## 本关定位

网关是客户端与内部服务之间的边界：聚合路由、横切策略（鉴权、限流、观测），避免每个服务重复实现入口逻辑。本关聚焦选型与路由 / 过滤器模型，而不是把业务规则全塞进网关。

## 闯关任务

- [ ] 能够说明网关与 BFF、反向代理、服务网格入口的职责差异。
- [ ] 能够配置 Spring Cloud Gateway 的路由与常用过滤器，并说出 WebFlux / MVC 两种 starter 的区别。
- [ ] 能够对比 Spring Cloud Gateway、Kong、APISIX、Envoy / Gateway API 的适用场景。
- [ ] 能够设计网关层限流与鉴权的落点，并说明不应下沉到网关的业务逻辑。
- [ ] 能够描述灰度 / 金丝雀在网关侧的常见实现方式。

## 知识要点

### 网关职责边界

适合：TLS 终结、路由改写、认证校验、全局限流、请求日志与 Trace 注入、金丝雀分流。不适合：复杂领域规则、跨多个聚合根的长事务编排（应放在应用服务或工作流）。

### Spring Cloud Gateway（2025 起双实现）

Spring Cloud Gateway 5.0.4；在 Spring Cloud 2025 起分为 WebFlux 与 Server MVC 两种实现。路由前缀 `spring.cloud.gateway.server.webflux` 与 Gateway Server WebFlux 文档一致。下面的 YAML 只做了语法解析，没有启动网关。

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
> Zuul 1 已废弃；推荐 starter 为 `spring-cloud-starter-gateway-server-webflux` / `spring-cloud-starter-gateway-server-webmvc`，旧名 `spring-cloud-starter-gateway` / `-gateway-mvc` 不再是文档推荐写法。

### Kubernetes Gateway API

在 K8s 原生栈中，用 Gateway API v1.7.0 + Envoy（或实现该 API 的控制器）做南北向流量，与 Spring Cloud Gateway 可并存：集群外 / 多语言入口用 Gateway API，Java 团队内聚合仍可用 SCG。

## 选型对比

| 方案 | 版本基线 | 特点 | 更适场景 |
|------|----------|------|----------|
| Spring Cloud Gateway | 5.0.4 | Java 生态、过滤器可编程 | Spring 技术栈、中等流量 |
| Kong | 3.9.4 | 插件生态、Lua / PDK | 多语言、插件化治理 |
| Apache APISIX | 3.19.0 | 动态配置、高性能 | 高流量、云原生插件 |
| Envoy + Gateway API | Envoy 1.40.2 / GAPI v1.7.0 | 与 K8s 深度集成 | 平台团队、网格同源数据面 |

## 常见误区

- 把订单计价、库存扣减等业务写进网关过滤器。
- 网关与服务双重鉴权却不一致，导致调试困难。
- 仅用网关限流、服务内无限流，内部扇出仍可能被打满。
- 继续新建 Zuul 1 项目。

## 实践任务

- [ ] 用 WebFlux starter 搭一条 `Path` 路由，加 `RequestRateLimiter` 或简单自定义过滤器。
- [ ] 对照官方文档列出 MVC 版与 WebFlux 版在依赖与编程模型上的差异。
- [ ] 阅读 Gateway API 的 `HTTPRoute` 示例，画一张「外部流量 → Gateway → Service」示意。

## 资料索引

- [Spring Cloud Gateway WebFlux Starter](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/starter.html) — 推荐 starter 与路由说明
- [Kong Gateway 文档](https://docs.konghq.com/gateway/latest/) — Kong 官方文档
- [Apache APISIX 文档](https://apisix.apache.org/docs/) — APISIX 总览与概念
- [Envoy 文档](https://www.envoyproxy.io/docs/envoy/latest/) — 数据面代理参考
- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) — 南北向流量规范

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Spring Cloud 2025 起，文档推荐的 WebFlux 网关 starter 是：
    - A. `spring-cloud-starter-zuul`
    - B. `spring-cloud-starter-gateway`
    - C. `spring-cloud-starter-gateway-server-webflux`
    - D. `spring-boot-starter-web`
2. 【单选】下列哪项更适合放在 API 网关？
    - A. 跨服务的 Saga 补偿逻辑
    - B. JWT 校验与路由级限流
    - C. 数据库分片键计算
    - D. 本地二级缓存淘汰策略
3. 【简答】网关限流与服务内限流为什么常常需要同时存在？
4. 【单选】在 K8s 中表达「HTTP 路径路由到某 Service」的较新标准 API 是：
    - A. Ingress 注解私有方言（唯一选择）
    - B. Gateway API（如 HTTPRoute）
    - C. 仅 ConfigMap
    - D. 仅 Service 的 ClusterIP
5. 【简答】Zuul 1 为什么不应再用于新项目？

<details markdown><summary>参考答案</summary>

1. C — 旧名不再是文档推荐写法。
2. B — 鉴权与入口限流是典型横切能力。
3. 网关保护入口与整体配额；服务内限流保护自身依赖与线程 / 连接资源，防止内部调用或旁路打满。
4. B — Gateway API 是 Ingress 的演进方向。
5. 已停止维护 / 废弃，缺少现代过滤器模型与长期安全修复保障。

</details>

---

← [上一节：架构基础与拆分](../01-architecture/) · [返回 微服务](../) · [下一节：注册发现与配置](../03-discovery-config/) →
