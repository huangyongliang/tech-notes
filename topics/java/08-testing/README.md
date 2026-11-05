# 测试 Testing

> [Java](../) › 测试

JUnit 5（Jupiter）、参数化测试、Mockito、AssertJ，以及 Testcontainers 和 Spring Boot Test 切片测试。重点是写出可维护的测试结构。

## 闯关任务

**QUEST 08 · 第二章 平台**

- [ ] 能够用 JUnit 5（Jupiter）编写测试，并使用 `@BeforeEach`、`@DisplayName`、`@Nested` 组织测试结构。
- [ ] 能够用 `@ParameterizedTest` 配合 `@ValueSource` / `@CsvSource` 编写参数化测试。
- [ ] 能够用 Mockito 创建 mock、打桩（stub）并验证调用，用 AssertJ 写可读的断言。
- [ ] 能够用 Testcontainers 在测试中启动真实数据库等依赖。
- [ ] 能够选择合适的 Spring Boot Test 切片注解（如 `@WebMvcTest`、`@DataJpaTest`），而不是一律用 `@SpringBootTest`。

**奖励**：+100 XP · 徽章「红绿循环」（徽章名暂定，内容建设中）

## 建议先收的资料

- JUnit 5 用户指南
- Mockito 文档
- 示例代码
- 常见反模式笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】JUnit 5 中声明参数化测试的注解是：
    - A. `@Test(params)`
    - B. `@ParameterizedTest`
    - C. `@RunWith(Parameterized.class)`
    - D. `@Theory`
2. 【简答】Mockito 中 `when(...).thenReturn(...)` 和 `verify(...)` 分别做什么？
3. 【简答】与 H2 内存库相比，用 Testcontainers 跑数据库测试的主要好处是什么？
4. 【单选】只测试 Web 层的 Controller、不加载完整应用上下文，应使用：
    - A. `@SpringBootTest`
    - B. `@WebMvcTest`
    - C. `@DataJpaTest`
    - D. `@JsonTest`

<details markdown><summary>参考答案</summary>

1. B — `@RunWith(Parameterized.class)` 是 JUnit 4 的写法。
2. `when...thenReturn` 为 mock 打桩、设定返回值；`verify` 校验某方法是否被调用、调用了几次。
3. 用与生产相同的数据库和版本，避免方言、行为差异导致测试通过、线上失败。
4. B — 切片测试只加载 MVC 相关的 Bean，更快、更聚焦。

</details>

---

← [上一节：构建工具](../07-build-tools/) · [返回 Java](../) · [下一节：Spring 框架](../09-spring/) →
