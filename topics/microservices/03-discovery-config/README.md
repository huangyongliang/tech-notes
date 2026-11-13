# 注册发现与配置 {#discovery-config}

> [微服务](../) › 注册发现与配置

发现保证的是「现在有哪些实例」；配置中心保证的是「配置如何分发」。二者都不代替负载均衡策略，也不保证每次变更都能安全热更新。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 给了服务边界。[API 网关](../02-api-gateway/) 的路由常用 `lb://` 这类服务名。本页写名字如何变成实例，以及运行时配置从哪里来、变更时什么能热更新、什么必须滚动发布。负载均衡算法、断路与重试在 [05](../05-resilience/)。发现列表不是策略。Spring 侧的 Config 与发现抽象回链 [Java 09](../../java/09-spring/)，本页不重写容器合同。Kubernetes 上 Service 与 ConfigMap 的平台细节见 [12](../12-containers-k8s/)。

## 谁持有实例列表 {#_2}

客户端发现：调用方拉取或订阅实例列表，再在本地做负载均衡，例如 Spring Cloud LoadBalancer 加上注册中心。服务端发现：调用方只访问稳定的 VIP 或 DNS，由代理或 kube-proxy 转发。

Kubernetes 上，Service 加 DNS 就是典型的服务端发现。Spring Cloud Kubernetes **5.0.4**（随 Spring Cloud 2025.1.4）可以把 Service 发现接到 Spring 的发现抽象。不要在 K8s 上再叠一层与 DNS 冲突的自定义发现，却说不清流量到底走哪一条路径。

## 发现保证什么 {#discovery-guarantees}

发现保证的是注册、健康检查和列表更新。它不选择具体的负载均衡算法，不设置超时，也不代替服务实例自己的就绪探针。列表里有实例，只说明「可以被发现」，不说明「现在调用一定成功」。调用合同在 [04](../04-communication/)。

## Nacos、Consul 与仍在维护的 Eureka {#registries}

Nacos **3.3.0**（2026-10-29）同时覆盖注册与配置，是 Spring Cloud Alibaba 生态里的常见选择。2.5.5 是并行维护的 2.x 线，不要把 2.x 补丁写成 3.x 的最新版。Consul **2.1.0**（2026-10-22，非预发布）偏重服务发现、健康检查与多数据中心，配置可以用 KV。

Eureka 仍随 Spring Cloud Netflix **5.0.3**、Spring Cloud **2025.1.4** 发布。现行参考文档仍把它作为该项目提供的服务发现模式。历史文档里「维护模式」点名的是 Zuul、Ribbon、Hystrix 等模块，并写明不包括 Eureka。因此不要把 Eureka 整包写成「维护模式」，那也不是官方弃用。它适合存量 Netflix 技术栈。新项目若走 Alibaba 生态，更常见的是 Nacos；若平台已是 K8s 且团队成熟，可以优先用 Service 与 DNS。这是选型建议。

Spring Cloud Alibaba **2025.1.0.0** 是 2026-11-13 打开的 Maven `com.alibaba.cloud:spring-cloud-alibaba-dependencies` 的 `latest` 与 `release`，`lastUpdated` 为 2026-02-06。发行说明写明它支持 Boot 4.x 与 Cloud 2025.1.x，并去掉 bootstrap，改用 `spring.config.import`。不要用该仓库的 GitHub Latest 判断当前列车：多列车仓库的 Latest 很容易指向旧维护标签。还要分开两件事：SCA 2025.1.0.0 发布时 BOM 管理的 nacos-client 是 **3.1.1**；本页作为服务器和产品线来写的 Nacos 是 **3.3.0**。不得把二者混写成「SCA 已经绑定 3.3.0」。

## 3.3 起默认要身份 {#nacos-auth}

Nacos 官方概览写明：3.3 起 Client API、SDK 和 gRPC 请求默认需要身份信息，Admin API 和 Console API 也默认开启鉴权。下面的 YAML 未连接 Nacos，也没有写入凭据。按 3.3 的默认，接入前要配置访问凭据，不要以为这段示例可以在无鉴权的 3.3 服务器上直接跑通。`server-addr` 与示例里的 `serverAddr` 是同一项配置的不同写法。dataId 按示例写成「应用名 + 后缀」，这里用 `leave-service.properties` 示意。

```yaml
spring:
  application:
    name: leave-service
  config:
    import:
      - nacos:leave-service.properties?refreshEnabled=true
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
      config:
        server-addr: 127.0.0.1:8848
```

Nacos 3.x 把 AI 管理中心（Skill、Agent、MCP 等）写成一等能力。那超出本章范围，本页不展开。

## 推送成功不等于已经安全生效 {#config-refresh}

改配置并推送成功，不等于业务已经无感热更新。`@RefreshScope` 靠代理刷新作用域 Bean。启动期才读取的值、连接池等有状态 Bean、安全上下文，往往需要重建或滚动发布。密钥与普通配置要分离，不要把数据库密码明文放进可被全体开发拉取的配置仓库。密钥轮换的默认路径是改 Secret（或等价物）后滚动重启，而不是假设热更新一定安全。

Spring Cloud Config **5.0.6** 仍是纯配置方案，常配合 Git 后端，本身不做发现。

## 选型是条件，不是名单 {#discovery-choice}

| 方案 | 版本基线 | 发现 | 配置 | 备注 |
|------|----------|------|------|------|
| Nacos | 3.3.0 | 有 | 有 | Alibaba 生态里常见；与 SCA BOM 里的客户端版本不是同一件事 |
| Consul | 2.1.0 | 有 | 有（KV） | 多数据中心、健康检查 |
| Spring Cloud Config | 5.0.6 | 无 | 有 | 常配合 Git 后端 |
| Eureka | Netflix 5.0.3 | 有 | 无 | 当前列车仍维护，适合存量 |
| K8s 原生 | SCK 5.0.4 | Service / DNS | ConfigMap / Secret | 平台成熟时优先 |

## 常见误读 {#_3}

- 「Eureka 处于维护模式，所以已经官方弃用。」现行 Netflix 文档仍提供 Eureka。历史维护模式名单不包括它。
- 「SCA 2025.1.0.0 已经绑定 Nacos 3.3.0。」该列车发布时 BOM 里的 nacos-client 是 3.1.1。
- 「GitHub Latest 就是 SCA 的当前列车。」这类多列车仓库的 Latest 可能指向旧维护标签，以 Maven 和 `2025.1.0.0` 标签为准。
- 「配置推送成功，所有 `@Value` 都已经热更新。」有状态 Bean 和只在启动期读取的值往往要重建或滚动发布。
- 「列表里有实例，调用就一定成功。」发现不设置超时，也不代替就绪探针。
- 「K8s 上再挂一套与 DNS 平行的发现更保险。」说不清流量走哪条路径，就是冲突。

## 可选核对 {#discovery-check}

发现和配置的合同已经写在上面。这两问只核对它们。

1. 客户端发现与服务端发现的主要区别是什么？
2. 为什么配置中心「推送成功」不等于业务无感热更新？

<details markdown><summary>参考答案</summary>

1. 客户端发现由调用方持有实例列表，再在本地选择实例。服务端发现由调用方访问稳定的 VIP 或 DNS，转发由代理或 kube-proxy 完成。
2. `@RefreshScope` 只刷新作用域 Bean。启动期才读取的值、连接池和安全上下文往往要重建或滚动发布。推送成功只说明配置已分发。

</details>

## 资料索引 {#_4}

- [Nacos 文档总览](https://nacos.io/docs/latest/overview/) — 2026-11-13：3.3 起 Client API、SDK 和 gRPC 默认需要身份信息。AI 管理中心不在本章展开。当前 3.x 稳定线是 3.3.0（2026-10-29）；2.5.5 是 2.x 维护线。
- [Consul 文档](https://developer.hashicorp.com/consul/docs) — 服务发现、健康检查与多数据中心。稳定线 2.1.0（2026-10-22，非预发布）。
- [Spring Cloud Config 参考](https://docs.spring.io/spring-cloud-config/reference/) — 纯配置方案。5.0.6 随 2025.1.4 发布，本身不做发现。
- [Spring Cloud Kubernetes](https://docs.spring.io/spring-cloud-kubernetes/reference/) — 5.0.4 把 Service 发现接到 Spring 的发现抽象。
- [Spring Cloud Netflix 参考](https://docs.spring.io/spring-cloud-netflix/reference/) — 现行范围是 Eureka 服务发现，稳定线 5.0.3。不要把历史维护模式名单套到 Eureka 上。
- [Spring Cloud Alibaba 2025.1.0.0 发行说明](https://github.com/alibaba/spring-cloud-alibaba/releases/tag/2025.1.0.0) — 支持 Boot 4.x 与 Cloud 2025.1.x，去掉 bootstrap，改用 `spring.config.import`。当时 BOM 将 nacos-client 升到 3.1.1，不是 Nacos 3.3.0。Maven `com.alibaba.cloud:spring-cloud-alibaba-dependencies` 的 `latest` / `release` 仍是 2025.1.0.0。不要用该仓库的 GitHub Latest 判断当前列车。
- [Java 09](../../java/09-spring/) — Config 与发现的职责分界。本页不重写容器。
- [微服务 05](../05-resilience/) — 负载均衡算法与容错。发现列表不是策略。
- [微服务 12](../12-containers-k8s/) — Service 与 ConfigMap 的平台细节。

---

← [上一节：API 网关](../02-api-gateway/) · [返回 微服务](../) · [下一节：服务通信](../04-communication/) →
