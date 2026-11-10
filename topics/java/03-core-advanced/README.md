# 异常、泛型、反射与注解 {#core-advanced}

> [Java](../) › 异常、泛型、反射与注解

受检与非受检异常的设计、泛型擦除和通配符（PECS）、反射与 `MethodHandle`、注解与注解处理器。这是理解 Spring、Lombok、MapStruct 等框架原理的基础。

## 闯关任务

**QUEST 03 · 第一章 语言**

- [ ] 能够区分受检异常与非受检异常，并说明各自适用的场景。
- [ ] 能够解释泛型擦除带来的限制，并用 PECS 原则正确选择 `? extends` / `? super`。
- [ ] 能够用反射读取类的字段、方法和注解，并说出 `MethodHandle` 与反射的主要区别。
- [ ] 能够自定义注解，并说明 `@Retention` 不同取值对运行时和注解处理器的影响。
- [ ] 能够说出 Spring、Lombok、MapStruct 分别依赖反射 / 代理还是注解处理器。

**奖励**：+100 XP · 徽章「反射术士」（徽章名暂定，内容建设中）

## 建议先收的资料

- JLS 相关章节
- 《Effective Java》要点
- 示例代码
- 常见坑笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】以下哪个是非受检异常？
    - A. `IOException`
    - B. `SQLException`
    - C. `IllegalArgumentException`
    - D. `InterruptedException`
2. 【简答】为什么不能写 `new T()` 或 `obj instanceof List<String>`？
3. 【单选】方法要从集合中只读取元素（生产者），参数类型应写成：
    - A. `List<? super T>`
    - B. `List<? extends T>`
    - C. `List<T>`
    - D. `List<Object>`
4. 【简答】注解要在运行时通过反射读到，`@Retention` 应该设为什么？
5. 【简答】Lombok 和 MapStruct 主要在什么阶段生成代码？

<details markdown><summary>参考答案</summary>

1. C — 它继承自 `RuntimeException`，其余三个都是受检异常。
2. 泛型类型参数在编译后被擦除，运行时不知道 `T` 和 `String` 是什么类型。
3. B — PECS：Producer Extends，Consumer Super。
4. `RetentionPolicy.RUNTIME`；`CLASS`（默认）和 `SOURCE` 运行时读不到。
5. 编译期，通过注解处理器（Lombok 还会修改编译器 AST），不依赖运行时反射。

</details>

---

← [上一节：集合框架](../02-collections/) · [返回 Java](../) · [下一节：输入输出](../04-io-nio/) →
