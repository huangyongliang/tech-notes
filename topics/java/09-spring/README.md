# Spring 框架 Spring

> [Java](../) › Spring 框架

<div class="tn2-quest" data-quest="09" markdown>

<span class="tn2-quest__no">QUEST 09 · 第三章 生态</span>

**目标**

- [ ] 能够解释 IoC / 依赖注入，并说明 AOP 基于代理的实现方式。
- [ ] 能够描述 Spring Boot 自动配置的原理（条件注解），并使用 Actuator 暴露健康检查和指标。
- [ ] 能够比较 Spring MVC 与 WebFlux 的编程模型和适用场景。
- [ ] 能够说出 Spring Boot 4.x 的版本基线（Spring Framework 7.0、Spring Security 7.0、Jackson 3.0），以及 3.x → 4.x 迁移时要关注的点。
- [ ] 能够说出 Spring Cloud 中 Gateway、Config、OpenFeign 各自的作用。

**奖励**：+100 XP · 徽章「春之学徒」（徽章名暂定，内容建设中）

</div>

> 相关主题：[微服务 Microservices](../../microservices/) — Spring Cloud 在微服务体系中的选型与落地

IoC / AOP 原理、Spring Boot 自动配置和 Actuator、Spring MVC / WebFlux、Spring Security，以及 Spring Cloud（Gateway、Config、OpenFeign 等）。版本以 Boot 4.x / Framework 7 为主，并记录 3.x → 4.x 的迁移要点。

## 版本说明（2026-11）

- Spring Boot 最新 GA 为 4.1.2；Boot 4.0 起基于 Spring Framework 7.0、Spring Security 7.0、Jackson 3.0（[Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)）。
- Spring Cloud 最新为 2025.1.4（Oakwood），适配 Boot 4.0.x 和 4.1.x；2025.1.x 从 2025.1.2 起才支持 Boot 4.1.x（[Spring Cloud](https://spring.io/projects/spring-cloud)）。

## 建议先收的资料

- spring.io 官方参考文档
- Release Notes / 迁移指南
- starter 示例项目
- 面试 / 排障笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 再点下方「标记通关」。

1. 【单选】Spring Boot 4.x 基于哪个版本的 Spring Framework？
   A. 5.3　B. 6.1　C. 6.2　D. 7.0
2. 【简答】Spring Boot 自动配置是怎么做到「引入 starter 就生效、自己定义 Bean 就让位」的？
3. 【简答】同一个类中，方法 A 调用带切面（如 `@Transactional`）的方法 B，切面为什么不生效？
4. 【单选】Spring Cloud 中用声明式接口调用其他 HTTP 服务的组件是：
   A. Gateway　B. Config　C. OpenFeign　D. Actuator
5. 【单选】Spring Boot 4.0 默认使用的 Jackson 大版本是：
   A. 1.x　B. 2.x　C. 3.x　D. 不再使用 Jackson

<details markdown><summary>参考答案</summary>

1. D — Spring Boot 4.0 起基于 Spring Framework 7.0。
2. 自动配置类用 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等条件注解，类路径上有对应依赖才生效，用户已定义同类型 Bean 时就跳过。
3. AOP 基于代理，自调用走的是 `this`，没有经过代理对象。
4. C — OpenFeign 用接口加注解描述 HTTP 调用。
5. C — Boot 4.0 升级到 Jackson 3.0。

</details>

<div class="tn2-clear" data-quest="09"></div>

---

← [上一节：测试](../08-testing/) · [返回 Java](../) · [下一节：持久层](../10-persistence/) →
