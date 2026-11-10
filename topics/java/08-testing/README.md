# 测试 {#testing}

> [Java](../) › 测试

一次测试证明的是这次跑到的那一层。当前世代是 JUnit 6 的 Jupiter 编程模型；JUnit 5 不是现在的默认发行线。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[软件工程 04](../../software-engineering/04-verification/) 已经写明：没跑到的行为，没有被这次测试证明。本页不重写效力边界，也不重写测试金字塔。[微服务 15](../../microservices/15-testing/) 写分层在服务栈上的写法，[DevOps 03](../../devops/03-promotion-gating/) 写门禁把测试当作哪一种证据。这里只写 Jupiter、打桩与核对、真实引擎，以及 Spring Boot 切片各自覆盖哪一层。[Java 09](../09-spring/) 和 [Java 10](../10-persistence/) 是切片所针对的层，本页不提前教框架。

## Jupiter 组织的是场景 {#_2}

JUnit 6 是当前世代，要求 Java 17 或更高，与本主题的 JDK 25 基线相容。Jupiter 是在这套平台上编写测试的编程模型和扩展模型。`@Test` 标出一条测试，`@BeforeEach` 在每条测试前准备，`@DisplayName` 给场景一个可读的名字，`@Nested` 把相关场景收成一组。这些注解用来让结构表达场景，不是为了换一套名字。

`@ParameterizedTest` 配 `@ValueSource` 或 `@CsvSource`，是同一条断言作用于多组输入。它不增加「另外又证明了一条没跑到的路径」。每一组输入仍然只覆盖这次实际执行的那一次。

`@RunWith(Parameterized.class)` 是 JUnit 4 的写法，不是现行默认。JUnit Vintage 引擎已经弃用，只用于把旧测试暂时迁到平台上，不是新测试的默认引擎。历史称呼里的「JUnit 5」指的是同一套 Jupiter 模型的上一代发行线。2026 年 11 月的当前默认是 JUnit 6，不是 JUnit 5。

Boot 管理的 JUnit 与上游用户指南不是同一个补丁。合同写在 Jupiter 模型上。补丁号的差别放在资料索引。

## 打桩和核对不是同一件事 {#mockito}

Mockito 里，`when(...).thenReturn(...)` 为 mock 打桩，设定某次调用要返回什么。`verify(...)` 核对这次调用是否发生、发生了几次。打桩不是验证：返回值设好了，并不表示生产代码真的调用过它。验证也不替代打桩：核对调用发生过，并不设定返回值。两边都需要时，两句都要写。

AssertJ 把断言写成可读的句子，例如先指出实际值，再写期望。本页不巡览它的断言方法。

## 真实引擎，以及只加载一层 {#slices}

Testcontainers 在测试里启动真实的依赖，例如与生产相同的数据库引擎和版本。适用条件是：要核对的行为跟这个引擎有关，方言或行为差一截就会让测试通过、线上失败。它比 H2 一类内存库更重。不依赖真实引擎的单元测试，不必把它当成默认。Boot 4.x 使用的是 Testcontainers 2.x 这一线，具体补丁在资料索引。

`@WebMvcTest` 只加载 Web 层相关的 Bean，用来核对控制器的映射和校验。`@DataJpaTest` 只加载持久化切片，用来核对仓库和实体映射。`@SpringBootTest` 拉起更完整的应用上下文，范围更大，也更慢。选择的依据是这一次要证明哪一层，不是「切片一定更好」。需要整条装配一起工作时，完整上下文才对得上。Web 层和持久层各自的合同见 Java 09 和 Java 10。

## 常见误读 {#_3}

- 「参数化测试证明了更多路径。」它只是同一条断言换了多组输入。没放进这组输入的路径，仍然没被证明。
- 「`when...thenReturn` 已经验证了调用。」它只设定返回值。调用是否发生，要另写 `verify`。
- 「JUnit 5 仍是当前默认。」当前世代是 JUnit 6。`@RunWith(Parameterized.class)` 属于 JUnit 4。Vintage 只用于迁移。
- 「测试数据库就该一律用 `@SpringBootTest`。」Web 层的映射和校验，用只加载这一层的 `@WebMvcTest` 就对准了要证明的范围。

## 可选核对 {#testing-check}

打桩和切片的适用范围已经写在上面。这两问只核对它们。

1. `when(...).thenReturn(...)` 和 `verify(...)` 各保证什么？
2. 只核对 Web 层时，为什么优先考虑 `@WebMvcTest`，而不是一律 `@SpringBootTest`？

<details markdown><summary>参考答案</summary>

1. `when...thenReturn` 为 mock 设定返回值，不表示生产代码已经调用过它。`verify` 核对调用是否发生、发生了几次，不设定返回值。
2. `@WebMvcTest` 只加载 Web 层相关的 Bean，对准控制器的映射和校验。`@SpringBootTest` 拉起更完整的上下文，范围更大、更慢。这次要证明的是 Web 层，而不是整条装配。

</details>

## 资料索引 {#_4}

- [JUnit 6](https://junit.org/junit5/) — 当前世代是 JUnit 6，要求 Java 17 或更高。junit.org 的框架入口仍放在这条路径下。
- [JUnit 用户指南 6.1.3](https://docs.junit.org/current/user-guide/) — 上游当前指南。含 Jupiter 的 `@Test`、`@Nested`、参数化测试，以及已弃用、只用于迁移的 Vintage。Boot 4.1.2 管理的是 JUnit 6.0.3，不是这份指南的 6.1.3。
- [Spring Boot 依赖坐标](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html) — 2026-11-12 的当前文档，对应 Boot 4.1.2 管理的构件：JUnit 6.0.3、Mockito 5.23.0、AssertJ 3.27.7、Testcontainers 2.0.5。
- [Mockito 5.23.0](https://javadoc.io/doc/org.mockito/mockito-core/5.23.0/org.mockito/org/mockito/Mockito.html) — `when` 打桩，`verify` 核对调用。版本对齐 Boot 管理的 5.23.0，不是上游另发的更新补丁。
- [AssertJ](https://assertj.github.io/doc/) — 把断言写成可读的句子。本页不巡览 API。
- [Testcontainers](https://java.testcontainers.org/) — 在测试里启动真实依赖。Boot 4.x 这一线是 2.x。
- [Spring Boot 测试](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html) — `@SpringBootTest` 拉起应用上下文；`@WebMvcTest` 与 `@DataJpaTest` 只加载对应切片。
- [软件工程 04](../../software-engineering/04-verification/) — 没跑到的行为没有被这次测试证明。
- [微服务 15](../../microservices/15-testing/) — 分层写法。本页不重写金字塔。
- [DevOps 03](../../devops/03-promotion-gating/) — 门禁把测试当作哪一种证据。
- [Java 09](../09-spring/) 与 [Java 10](../10-persistence/) — 切片所针对的 Web 层和持久层。

---

← [上一节：构建工具](../07-build-tools/) · [返回 Java](../) · [下一节：Spring 框架](../09-spring/) →
