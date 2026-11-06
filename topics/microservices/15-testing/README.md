# 测试 Testing

> [微服务](../) › 测试

微服务测试金字塔：单元、集成、契约、端到端。单元测试基础链接 [测试 Testing](../../java/08-testing/)。

## 本关定位

服务变多后，E2E 变慢变脆，需要契约测试与 Testcontainers 把反馈前移。本关掌握金字塔分层，以及 Spring Cloud Contract / Pact、WireMock 的定位。

## 闯关任务

- [ ] 能够按测试金字塔分配用例比例与所属环境。
- [ ] 能够用 Testcontainers 启动真实依赖做集成测试。
- [ ] 能够解释消费者驱动契约（Consumer-Driven Contract）如何防止「提供者改坏消费者」。
- [ ] 能够对比 Spring Cloud Contract 与 Pact 的协作方式。
- [ ] 能够用 WireMock 隔离下游，编写可重复的失败注入测试。

## 知识要点

### 金字塔

单元（快、多）→ 集成（Testcontainers 2.0.5）→ 契约（Spring Cloud Contract 5.0.3 / Pact JVM 4.7.7）→ 少量 E2E。E2E 只覆盖关键用户旅程。

### 契约测试

提供者改 API 前先跑消费者契约；CI 中把契约当作构建工件传递。消费者驱动契约有时也被缩写成 CDC，和 [分布式事务](../07-distributed-transactions/) 里 Debezium 的变更数据捕获（Change Data Capture）不是一回事。Testcontainers 2.0.5 的 PostgreSQL 模块坐标是 `org.testcontainers:testcontainers-postgresql`。新包 `org.testcontainers.postgresql.PostgreSQLContainer` 不是泛型类；旧包 `org.testcontainers.containers.PostgreSQLContainer` 仍在，但已标记废弃。下面只把容器构造对着 2.0.5 编译通过（JDK 21.0.12.1，2026-11-06）。`@SpringBootTest` 与 `@Testcontainers` 是常见骨架，本次没有作为完整测试工程编译，也没有启动容器。

```java
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
class LeaveRepositoryIT {
    @Container
    static PostgreSQLContainer pg = new PostgreSQLContainer("postgres:18");
    // 配置 spring.datasource.url 指向容器...
}
```

### WireMock

WireMock 3.13.2 适合模拟下游超时、5xx、错误载荷，验证容错逻辑（与第 05 章呼应）。

## 选型对比

| 工具 | 版本基线 | 用途 |
|------|----------|------|
| Testcontainers | 2.0.5 | 真实依赖集成测试 |
| Spring Cloud Contract | 5.0.3 | 契约生成 / 验证（Spring 生态） |
| Pact JVM | 4.7.7 | 跨语言契约、Broker 生态 |
| WireMock | 3.13.2 | HTTP 下游桩与故障注入 |

## 常见误区

- 只用 E2E 回归，流水线数小时且抖动。
- 契约只写快乐路径，不覆盖错误码。
- 集成测试共用一个不可控的共享环境。
- Mock 过多导致「假绿」，上线才发现 SQL / 消息头不对。

## 实践任务

- [ ] 为仓库层写 Testcontainers 集成测试（PostgreSQL 或 Redis）。
- [ ] 选一个消费者调用，补一条契约（Contract 或 Pact）。
- [ ] 用 WireMock 模拟下游 500，断言熔断 / 降级行为。

## 资料索引

- [Testcontainers Java](https://java.testcontainers.org/) — 模块文档
- [Spring Cloud Contract](https://docs.spring.io/spring-cloud-contract/reference/) — 官方参考
- [Pact 文档](https://docs.pact.io/) — 消费者驱动契约
- [WireMock 文档](https://wiremock.org/docs/) — HTTP Mock
- [微服务测试金字塔讨论（Maria Neto 等经典材料可另寻）](https://microservices.io/patterns/testing/service-integration-contract-test.html) — 契约测试模式

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Testcontainers 的主要价值是：
    - A. 替代生产集群
    - B. 在测试中启动真实依赖容器
    - C. 仅生成 UML
    - D. 替换业务需求
2. 【单选】消费者驱动契约强调：
    - A. 只测 UI 颜色
    - B. 以消费者期望约束提供者变更
    - C. 取消单元测试
    - D. 只在本地口头约定
3. 【简答】为什么 E2E 数量应该克制？
4. 【单选】WireMock 更适合：
    - A. 存海量业务主数据
    - B. 模拟 HTTP 下游与故障
    - C. 替代 Istio
    - D. 编译原生镜像
5. 【简答】契约测试与 Mock 单元测试如何搭配？

<details markdown><summary>参考答案</summary>

1. B — 用真实引擎验证驱动与 SQL / 协议。
2. B — 防止提供者破坏已有消费者。
3. 慢、脆、定位难；应覆盖关键路径，细节下沉到下层测试。
4. B — HTTP 桩与故障注入。
5. 单元 Mock 快测逻辑；契约保证与真实对端的交互假设仍成立。

</details>

---

← [上一节：持续交付与 GitOps](../14-cicd-gitops/) · [返回 微服务](../) · [下一节：性能与云原生 Java](../16-cloud-native-java/) →
