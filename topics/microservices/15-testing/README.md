# 测试 {#testing}

> [微服务](../) › 测试

每一层测试只核对这一层真实执行过的行为。契约要由提供者验证；真实依赖也不等于真实生产。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 08](../../java/08-testing/) 写了 JUnit、Mock 和切片。本页不重复注解课。当前 Jupiter 世代是 6，见下文的版本边界。[服务通信](../04-communication/) 写了调用合同，[消息与事件驱动](../06-messaging/) 写了消息头和投递，[容错与流量治理](../05-resilience/) 写了超时和有限重试。本页把这些假设放进跨服务的测试证据里。证据如何进入晋级门禁，回 [DevOps 03](../../devops/03-promotion-gating/)。测试不是正确性证明。

## 测试层次围绕要核对的假设 {#_2}

单元测试快、数量多，隔离的是算法和业务分支。集成测试用真实依赖核对驱动、SQL 和协议。契约测试核对消费者和提供者之间的交互假设。少量端到端测试只核对关键用户旅程。

没有一条固定百分比的金字塔可以当标准。测试数量也不能代替被覆盖的假设。共享的集成环境不可控。端到端慢、脆、难定位，细节应下沉到能指出失败的那一层。原来单独叫做「金字塔」的内容就在这里。

## 真实依赖验证引擎，不复制整个生产 {#real-dependencies}

Testcontainers 用受控的生命周期启动真实 PostgreSQL：隔离数据、准备样本、等到就绪再断言。容器启动成功，只说明引擎起来了，不说明仓库里的 SQL 是对的。它也不复制生产的数据量、权限和故障。

Testcontainers **2.0.5** 的 PostgreSQL 模块坐标是 `org.testcontainers:testcontainers-postgresql`。新包 `org.testcontainers.postgresql.PostgreSQLContainer` 不是泛型类；2.0.5 的 javadoc 有 `PostgreSQLContainer(String)`。旧包 `org.testcontainers.containers.PostgreSQLContainer` 仍在，但已标记废弃，本页不倒退回去。`postgres:18` 是浮动的大版本标签，围栏原样保留。可重复的 CI 应在围栏之外锁定补丁或 digest。本文不编造镜像 digest。

下面的骨架省略了数据源绑定、业务断言和测试生命周期的完整接线，不能直接当成可运行的测试。2026-11-06 的旧注记只在 JDK 21.0.12.1 上核对过容器构造。2026-11-23 只用 JDK 25.0.5.1（Temurin 25.0.5.1+2）编译了 `new PostgreSQLContainer("postgres:18")`。编译类路径是 `testcontainers`、`testcontainers-jdbc`、`testcontainers-database-commons`、`testcontainers-postgresql`，版本都是 2.0.5。Spring 注解和数据源没有编成完整测试工程，容器没有启动。这次不能写成集成测试通过。

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

## 契约必须在真实提供者上验证 {#contract-testing}

<span id="_5"></span>

消费者驱动契约写出请求、响应和错误语义，并和消费者版本一起发布。提供者用自己的真实实现去验证这些契约。只有本地 mock 返回约定的数据，契约没有闭环。

Spring Cloud Contract 可以生成测试和桩。Pact 有消费者记录、提供者验证和 Broker 上的结果矩阵。契约验证进发布门禁，仍然不保证网络故障、鉴权和持久化全都正确。Contract 和 Pact 是生态和协作方式的差别，不是谁绝对更强。

消费者驱动契约有时被缩写成 CDC。它和 [分布式事务](../07-distributed-transactions/) 里 Debezium 的变更数据捕获（Change Data Capture）不是一回事。消息契约可以点到载荷和头部；投递语义回 [06](../06-messaging/)，本页不写成消息队列测试手册。

## WireMock 注入的是可重复的下游行为 {#wiremock}

下游超时、5xx 和错误载荷，是桩可以重复给出的输入，用来核对 [05](../05-resilience/) 里的超时、有限重试和降级是否真的发生。断言应看请求次数和超时范围，而不是只看「返回不为空」。本页不新增 WireMock 的 JSON 或 Groovy 例子。桩一直返回绿，只说明桩还遵守你写给它的假设，不说明对端仍然遵守。

## 工具版本与测试证据不要混写 {#test-choice}

<span id="_6"></span>

| 工具 | 版本基线 | 它核对什么 |
|------|----------|------------|
| Testcontainers | 2.0.5 | 受控生命周期里的真实依赖 |
| Spring Cloud Contract | 5.0.3 | Spring 生态里的契约生成和验证 |
| Pact JVM | 4.7.7 | 跨语言契约和 Broker 结果 |
| WireMock | 3.13.2 | 可重复的 HTTP 下游行为 |

2026-11-23 这些 GA 号没有变。JUnit 上游当前 GA 是 **6.1.3**（文档 current 指向 6.1.3，GitHub 非预发布 r6.1.3，2026-08-07）。6.2.0-M1 是预览；Maven `junit-jupiter` 的 `latest` / `release` 指向 6.2.0-M1，不是默认。不要把 JUnit 5 写成当前世代。有些插件或构件仍叫 `junit5`，那是历史名字。

WireMock 下载页的 3.x 仍是 3.13.2（GA，2025-11-14）。4.x 明确是 beta。Maven `org.wiremock:wiremock` 的 `latest` / `release` 是 **4.0.0-beta.44**（`lastUpdated` 2026-11-17），不是默认。Spring Cloud Contract 5.0.3 发布于 2026-06-12（Asia/Shanghai）。4.3.4 是维护分支，即使发布时刻稍晚，也不替换 5.0.3。

Boot 4.2.0 与 Cloud 2026.0.0 已经是 GA，不再是 RC。它们管理的 JUnit 或 Testcontainers 是另一条轴。本页不把「上游最新」写成原例所用的 BOM，也不迁移这则示例的平台。原例仍按 Testcontainers 2.0.5 核对。

## 常见误读 {#_3}

<span id="_7"></span>

- 「端到端跑得越多越安全。」它慢、脆，而且说不清失败在哪一层。
- 「契约只写快乐路径。」错误码也是消费者假设。
- 「桩一直是绿的，提供者就还遵守契约。」桩只遵守你写给它的脚本。
- 「集成测试共用一套不可控环境就够真实。」脏数据让失败无法重复。
- 「容器起来了，测试就通过了。」引擎就绪不等于 SQL 或协议断言已经执行。
- 「消费者 CDC 就是 Debezium 的 CDC。」一个是契约，一个是变更数据捕获。
- 「JUnit 或 WireMock 的 Maven `latest` 就是当前 GA。」它们分别指向 6.2.0-M1 和 4.0.0-beta.44。

## 可选核对 {#service-test-check}

<span id="_8"></span>

契约闭环和真实依赖的边界已经写在上面。这两问只核对它们。

1. 本地桩测试一直是绿的，为什么仍要提供者验证？
2. Testcontainers 核对了哪些共享 mock 核对不到的假设，又不能证明什么？

<details markdown><summary>参考答案</summary>

1. 桩返回的是你写进桩的数据。提供者验证才用真实实现去满足已发布的契约。没有这一步，对端改了字段或错误码，本地仍然是绿的。
2. 它启动真实数据库引擎，能核对驱动、SQL 和协议，而共享 mock 只返回脚本。它不复制生产的数据量、权限和故障，容器就绪也不等于业务断言已经通过。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [Java 08](../../java/08-testing/) — Jupiter、Mock 和切片。本页不重讲。JUnit 当前 GA 是 6.1.3，见 [发行说明](https://docs.junit.org/current/release-notes/)。
- [Testcontainers PostgreSQL 模块](https://java.testcontainers.org/modules/databases/postgres/) 与 [2.0.5 javadoc](https://javadoc.io/static/org.testcontainers/testcontainers-postgresql/2.0.5/org/testcontainers/postgresql/PostgreSQLContainer.html) — `PostgreSQLContainer(String)`。Maven `testcontainers-postgresql` 的 `latest` / `release` 是 2.0.5。文档示例里的旧镜像标签不要当成当前 PostgreSQL 补丁。
- [Spring Cloud Contract](https://docs.spring.io/spring-cloud-contract/reference/) 与 [GitHub Releases](https://github.com/spring-cloud/spring-cloud-contract/releases) — GA 5.0.3。4.3.4 是维护线。
- [Pact JVM Releases](https://github.com/pact-foundation/pact-jvm/releases) — tag `4_7_7`，2026-11-04。Maven `au.com.dius.pact.consumer:junit5` 的 4.7.7 与之交叉。Pact 文档 changelog 里没有找到 4.7.7 条目，精确补丁以仓库和 Maven 为准，也不是 Pact 全生态的统一版本。协作流程见 [Pact 文档](https://docs.pact.io/)。
- [WireMock 下载](https://wiremock.org/docs/download-and-installation/) — 3.x GA 3.13.2；4.x 是 beta。Maven `latest` / `release` 指向 4.0.0-beta.44。
- [DevOps 03](../../devops/03-promotion-gating/) — 证据如何进入晋级门禁。
- [微服务 05](../05-resilience/)、[06](../06-messaging/)、[07](../07-distributed-transactions/) — 容错、消息投递、Change Data Capture。本页只区分两种 CDC。

---

← [上一节：持续交付与 GitOps](../14-cicd-gitops/) · [返回 微服务](../) · [下一节：性能与云原生 Java](../16-cloud-native-java/) →
