# 注册发现与配置 {#discovery-config}

> [微服务](../) › 注册发现与配置

服务实例如何被发现、配置如何集中管理和动态刷新。对比 AP / CP 注册中心与 K8s 原生方案。

Spring Cloud 相关框架本身见 [Spring 框架](../../java/09-spring/)。

## 本关定位

没有稳定的服务发现与配置，客户端负载均衡、动态扩缩容和灰度都无从谈起。本关弄清「谁负责注册、如何发现、配置如何推送 / 拉取与刷新」，并按部署环境选型。

## 闯关任务

- [ ] 能够对比客户端发现与服务端发现，以及 K8s Service / DNS 原生发现。
- [ ] 能够说明 Nacos、Consul、Eureka 在一致性模型与生态上的差异。
- [ ] 能够配置 Spring Cloud Config 或 Nacos Config，并演示配置动态刷新的注意点。
- [ ] 能够说明 Secret / 敏感配置与普通配置的分离原则。
- [ ] 能够在「Spring Cloud Alibaba」与「K8s 原生」两条路线中做出场景化选择。

## 知识要点

### 发现模式

- 客户端发现：实例列表拉到调用方，再本地负载均衡（如 LoadBalancer + 注册中心）。
- 服务端发现：调用方只访问 VIP / DNS，由代理或 kube-proxy 转发。
- K8s：Service + DNS 即服务端发现；Spring Cloud Kubernetes 5.0.4 可把 Service 发现接到 Spring 抽象。

### Nacos 与 Consul

Nacos 3.3.0 同时覆盖注册与配置，国内 Spring Cloud Alibaba 2025.1.0.0 生态常用。Consul 2.1.0 偏 CP 的服务发现与健康检查、多数据中心。Eureka 仍在 Spring Cloud Netflix 维护，但新项目更推荐 Nacos 或 K8s 原生。

发现侧的 `server-addr`，以及配置侧必须有的 `spring.config.import`，对照的是 Spring Cloud Alibaba 2025.1.0.0 官方示例。`server-addr` 与示例里的 `serverAddr` 是同一项配置的不同写法。dataId 按示例写成「应用名 + 后缀」，这里用 `leave-service.properties` 示意。未连接 Nacos，也没有写入示例仓库里的默认账号。

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

### 配置刷新

改配置不等于业务安全生效：注意 `@RefreshScope` 的代理语义、连接池等有状态 Bean 是否真能热更新，以及密钥轮换是否需要滚动发布。

## 选型对比

| 方案 | 版本基线 | 发现 | 配置 | 备注 |
|------|----------|------|------|------|
| Nacos | 3.3.0 | 有 | 有 | Spring Cloud Alibaba 常用 |
| Consul | 2.1.0 | 有 | 有（KV） | 多 DC、健康检查强 |
| Spring Cloud Config | 5.0.6 | 无 | 有 | 常配合 Git 后端 |
| Eureka | 维护模式 | 有 | 无 | 存量为主 |
| K8s 原生 | SCK 5.0.4 | Service/DNS | ConfigMap/Secret | 平台成熟时优先 |

## 常见误区

- 把数据库密码明文放进可被全体开发拉取的配置仓库。
- 假设所有 `@Value` 都能热更新。
- 在 K8s 上再叠一层与 DNS 冲突的自定义发现，却没有明确流量路径。
- 新项目仍首选 Eureka。

## 实践任务

- [ ] 本地启动 Nacos，注册两个相同服务实例，用 LoadBalancer 调用并观察实例变化。
- [ ] 用 ConfigMap + Spring Cloud Kubernetes（或纯环境变量）完成一次配置注入对比。
- [ ] 演练一次密钥轮换：改 Secret → 滚动重启 → 验证无短暂 5xx 的策略。

## 资料索引

- [Nacos 文档总览](https://nacos.io/docs/latest/overview/) — 注册与配置官方说明
- [Consul 文档](https://developer.hashicorp.com/consul/docs) — 架构与服务发现
- [Spring Cloud Config 参考](https://docs.spring.io/spring-cloud-config/reference/) — Config Server / Client
- [Spring Cloud Kubernetes](https://docs.spring.io/spring-cloud-kubernetes/reference/) — K8s 发现与配置集成

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】在 Kubernetes 中，最常见的服务发现方式是：
    - A. 仅 Eureka
    - B. Service 名称 + 集群 DNS
    - C. 硬编码 Pod IP
    - D. 仅本地 hosts 文件
2. 【单选】新项目若走 Spring Cloud Alibaba 技术栈，注册配置更常见的选择是：
    - A. Zuul
    - B. Nacos
    - C. Hystrix
    - D. Ribbon
3. 【简答】为什么配置中心「推送成功」不等于业务无感热更新？
4. 【单选】Eureka 在当前基线下的定位更接近：
    - A. 新项目首选
    - B. 维护模式，存量可用
    - C. 已从所有仓库删除
    - D. 仅用于 gRPC
5. 【简答】客户端发现与服务端发现的主要区别是什么？

<details markdown><summary>参考答案</summary>

1. B — kube-dns / CoreDNS 解析 Service。
2. B — Nacos 同时覆盖注册与配置。
3. 有状态 Bean、连接池、安全上下文等可能需重建；部分配置只在启动期读取。
4. B — 仍维护但新项目更推荐 Nacos 或 K8s 原生。
5. 客户端发现：调用方持有实例列表并自选；服务端发现：调用方访问稳定地址，由中间层转发。

</details>

---

← [上一节：API 网关](../02-api-gateway/) · [返回 微服务](../) · [下一节：服务通信](../04-communication/) →
