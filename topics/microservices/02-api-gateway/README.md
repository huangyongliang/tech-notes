# API 网关 API Gateway

> [微服务](../) › API 网关

统一入口，负责路由、鉴权、限流、灰度。对比 Java 原生网关与基于 Nginx / Envoy 的高性能网关。

## 主流选型

- Spring Cloud Gateway 5.0.4
- Kong 3.9.4
- Apache APISIX 3.19.0
- Envoy 1.40.2
- Kubernetes Gateway API v1.7.0

> [!WARNING]
> Zuul 1 已废弃；Spring Cloud Gateway 在 Spring Cloud 2025 起分为 WebFlux 和 Server MVC 两种实现，starter 改名为 `spring-cloud-starter-gateway-server-webflux` / `spring-cloud-starter-gateway-server-webmvc`，旧名 `spring-cloud-starter-gateway` / `-gateway-mvc` 不再是文档推荐写法。

## 建议先收的资料

- 官方文档路由 / 过滤器章节
- 网关性能对比
- Gateway API 规范

## 资料索引

- [Spring Cloud Gateway WebFlux Starter](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/starter.html) — WebFlux 版 starter 说明

---

← [上一节：架构基础与拆分](../01-architecture/) · [返回 微服务](../) · [下一节：注册发现与配置](../03-discovery-config/) →
