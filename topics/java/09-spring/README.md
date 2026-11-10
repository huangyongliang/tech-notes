# Spring 框架 {#spring-spring}

> [Java](../) › Spring 框架

> 相关主题：[微服务](../../microservices/) — Spring Cloud 在微服务体系中的选型与落地

容器创建对象并注入依赖。拦截只发生在调用经过代理的时候。自动配置在用户尚未定义同类型 Bean 时才补上。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 版本说明（2026-11） {#2026-11}

- Spring Boot 最新 GA 为 4.1.2；Boot 4.0 起基于 Spring Framework 7.0、Spring Security 7.0、Jackson 3.0（[Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)）。
- Boot 4.1 管理的 Security 是 7.1.x、Jackson 是 3.1.x。这是 4.1 在 4.0 基线上的次要版本，不改「4.0 起基于 Security 7.0、Jackson 3.0」。Jackson 2 仍以弃用形式被管理，不是 4.x 的默认。
- Spring Cloud 最新为 2025.1.4（Oakwood），适配 Boot 4.0.x 和 4.1.x；2025.1.x 从 2025.1.2 起才支持 Boot 4.1.x（[Spring Cloud](https://spring.io/projects/spring-cloud)）。2025.0.x 的代号是 Northfields，不要与 Oakwood 写混。
- Boot 4.2、Framework 7.1、Cloud 2026.0 在 2026-11-12 仍是预发布，不是当前默认。Framework 仍是 7.0 这一线；项目页标题上的补丁号不是 Boot 正在管理的补丁。

## 这一页补哪一块 {#_1}

[Java 03](../03-core-advanced/) 写注解要在运行时被看见，保留期得是 `RUNTIME`，也写了 Spring 的典型路径是运行时反射或代理。本页接的是下一句：即使注解还在，拦截也要走代理。[Java 04](../04-io-nio/) 和 [Java 05](../05-concurrency/) 写阻塞、就绪和虚拟线程。比较 MVC 与 WebFlux 时只回指，不重讲。[Web 03](../../web/03-request-handling/) 写 HTTP 语义，并已把 MVC / WebFlux 的实现指到本页。报文和状态码仍以 [计算机基础 05](../../cs-basics/05-networking/) 为准。切片测试见 [Java 08](../08-testing/)。`@Transactional` 的传播和失效见 [Java 10](../10-persistence/)。Actuator 之后的排障见 [Java 11](../11-performance-diagnostics/)。发现、通信和容错见 [微服务 03](../../microservices/03-discovery-config/)、[04](../../microservices/04-communication/)、[05](../../microservices/05-resilience/)。

## 谁创建，谁注入 {#_2}

IoC 在这里指：组件需要的协作者由容器创建并注入，而不是组件自己 `new` 出来。本页写到「谁创建、谁注入」为止。注解的名字不是这条原理本身。XML 配置的历史也不在这里。

## 自调用不经过代理 {#proxy}

带 `@Transactional`、安全建议或自定义切面的方法，通常要经过代理对象，拦截才会发生。基于接口的代理只能拦截接口上的 public 方法。基于类的代理从 Framework 6.0 起，默认可把 protected 和包可见方法也纳入事务；private 方法仍然不在代理的拦截范围里。

同一个类里，方法 A 直接调用方法 B，走的是 `this`。这次调用不经过代理，切面不生效。注解写在 B 上，只说明容器在从外部进来的调用上可以拦截，不说明类内部的直接调用也会拦截。事务在这条边上如何失效，Java 10 再展开。

## 条件满足，自动配置才生效 {#autoconfig}

自动配置类用条件注解决定要不要生效。`@ConditionalOnClass` 要求类路径上已经有对应类型，才考虑这条配置。`@ConditionalOnMissingBean` 要求用户还没有定义同类型的 Bean；用户已经定义了，自动配置就让位。所以「引入 starter 就生效」的前提是这些条件满足。starter 不改写 Java 的语言合同。

Actuator 暴露健康检查和指标，回答的是「运行时可以观察到哪一类事实」。命令、dump 和调参在 Java 11。

## 两种 Web 模型 {#web-models}

MVC 建立在 Servlet 模型上。一条请求在处理期间占用服务器线程。虚拟线程下这意味着什么，见 Java 05，本页不重讲。WebFlux 是反应式、非阻塞的编程模型，适合大量时间花在等待 I/O 上的并发，而且调用链整体都得是非阻塞的。在阻塞式 JDBC 外面套一层 WebFlux，不会自动得到那条收益。不要写成「WebFlux 一定更快」。哪一种都不是 Web 平台的默认。HTTP 的语义仍以 Web 03 为准。

## 三个 Cloud 组件各管一件事 {#cloud-roles}

Gateway 是基于 Spring 的路由和网关。Config 提供集中式的外部配置。OpenFeign 用声明式接口描述对其他 HTTP 服务的调用。这里只到职责分界。发现、容错和通信的实践在微服务 03、04、05。

## 常见误读 {#_3}

- 「注解写上，切面就一定生效。」自调用走 `this`，不经过代理，拦截不会发生。
- 「引入 starter 就改写了语言合同。」自动配置只在类路径条件和缺失 Bean 的条件满足时补上。用户定义了同类型 Bean，它就让位。
- 「Boot 4.x 的默认 JSON 库仍是 Jackson 2。」4.0 起的默认是 Jackson 3。Jackson 2 以弃用形式留在管理列表里，不是默认。
- 「WebFlux 一定更快。」收益依赖整条调用链非阻塞。阻塞式访问套上 WebFlux，不会自动变成非阻塞。

## 可选核对 {#spring-check}

代理和自动配置的条件已经写在上面。这两问只核对它们。

1. 同一个类里，方法 A 调用带切面的方法 B，切面为什么不生效？
2. 自动配置如何做到「有 starter，且用户还没有定义同类型 Bean」时才生效？

<details markdown><summary>参考答案</summary>

1. 这类切面走代理。A 调用 B 用的是 `this`，调用不经过代理对象，所以拦截不会发生。
2. `@ConditionalOnClass` 要求类路径上已有对应类型。`@ConditionalOnMissingBean` 要求用户还没有定义同类型的 Bean。用户已经定义了，自动配置就让位。

</details>

## 资料索引 {#_4}

- [Spring Boot 4.0 发行说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes) — Boot 4.0 起基于 Framework 7.0、Security 7.0、Jackson 3.0。Jackson 2 以弃用形式保留。
- [Spring Boot 4.1 发行说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.1-Release-Notes) — 4.1.0 起管理 Security 7.1、Hibernate 7.4，Framework 仍是 7.0.x。
- [Boot 依赖坐标](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html) — 2026-11-12 当前文档，对应 4.1.2 管理的构件：Framework 7.0.10、Security 7.1.2、`tools.jackson` 3.1.7。项目页标题仍可能显示 Framework 7.0.8，那个补丁号不是这里的管理版本。
- [Spring Framework 项目页](https://spring.io/projects/spring-framework) — 2026-11-12 标题仍是 7.0.8。7.1 的 RC 不是当前默认。正文钉的是 Framework 7.0。
- [声明式事务](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) — 只有从外部经过代理进来的调用才会被拦截。自调用不会开始那段事务。
- [理解 AOP 代理](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html) — 代理模型的适用条件。
- [`ConditionalOnMissingBean`](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/condition/ConditionalOnMissingBean.html) — 用户已经定义同类型 Bean 时，自动配置让位。
- [Spring Boot 自动配置](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html) — 条件决定配置是否生效。
- [Spring Cloud](https://spring.io/projects/spring-cloud) — 2026-11-12 标题为 2025.1.4。2025.1.x（Oakwood）适配 Boot 4.0.x 和 4.1.x，从 2025.1.2 起支持 4.1.x。2025.0.x 是 Northfields。
- [Java 03](../03-core-advanced/) — 注解的保留期，以及运行时反射或代理这条路径。
- [Java 04](../04-io-nio/) 与 [Java 05](../05-concurrency/) — 阻塞、就绪、虚拟线程。
- [Web 03](../../web/03-request-handling/) — HTTP 语义。本页只写 MVC / WebFlux 的实现合同。
- [计算机基础 05](../../cs-basics/05-networking/) — 报文和状态码。
- [Java 08](../08-testing/) — 切片测试对准哪一层。
- [Java 10](../10-persistence/) — `@Transactional` 的传播、回滚和自调用失效。
- [Java 11](../11-performance-diagnostics/) — Actuator 之外的排障。
- [微服务 03](../../microservices/03-discovery-config/)、[04](../../microservices/04-communication/)、[05](../../microservices/05-resilience/) — 发现、通信和容错。本页不写这些实践。

---

← [上一节：测试](../08-testing/) · [返回 Java](../) · [下一节：持久层](../10-persistence/) →
